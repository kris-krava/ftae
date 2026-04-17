import { supabaseAdmin } from '@/lib/supabase/admin';

export interface LandingStats {
  foundingArtists: number;
  piecesToTrade: number;
  daysUntilLaunch: number | null;
}

export async function getLandingStats(): Promise<LandingStats> {
  const [foundingRes, piecesRes, launchRes, foundingRows, artworkRows] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_founding_member', true)
      .eq('is_active', true),
    supabaseAdmin
      .from('artworks')
      .select('*', { count: 'exact', head: true })
      .eq('is_trade_available', true),
    supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', 'launch_date')
      .maybeSingle(),
    supabaseAdmin
      .from('users')
      .select('id, email, is_founding_member, is_active, created_at')
      .eq('is_founding_member', true)
      .eq('is_active', true)
      .limit(5),
    supabaseAdmin
      .from('artworks')
      .select('id, user_id, title, is_trade_available, created_at')
      .eq('is_trade_available', true)
      .limit(5),
  ]);

  // TEMP DIAGNOSTIC — remove after debugging stale stats issue
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const keyPrefix = key.slice(0, 12);
  const keyLen = key.length;
  const isJwt = key.split('.').length === 3;

  let serviceKeyRef: string | null = null;
  let serviceKeyRole: string | null = null;
  if (isJwt) {
    try {
      const seg = key.split('.')[1];
      const padded = seg + '='.repeat((4 - (seg.length % 4)) % 4);
      const json = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
      serviceKeyRef = json.ref ?? null;
      serviceKeyRole = json.role ?? null;
    } catch (e) {
      serviceKeyRef = `decode-error: ${(e as Error).message}`;
    }
  }

  // Raw REST hits — bypass supabase-js entirely
  type RawProbe = { status: number; contentRange: string | null; body: string };
  const rawProbe = async (path: string): Promise<RawProbe> => {
    try {
      const r = await fetch(`${url}/rest/v1/${path}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
        cache: 'no-store',
      });
      const body = await r.text();
      return {
        status: r.status,
        contentRange: r.headers.get('content-range'),
        body: body.slice(0, 500),
      };
    } catch (e) {
      return { status: -1, contentRange: null, body: `fetch-error: ${(e as Error).message}` };
    }
  };

  const [rawUsersFiltered, rawUsersAll, rawArtworksFiltered, rawArtworksAll] = await Promise.all([
    rawProbe('users?select=id,email,is_active,is_founding_member&is_founding_member=eq.true&is_active=eq.true&limit=5'),
    rawProbe('users?select=id,email&limit=5'),
    rawProbe('artworks?select=id,user_id,is_trade_available&is_trade_available=eq.true&limit=5'),
    rawProbe('artworks?select=id&limit=5'),
  ]);

  console.log('[landing-stats]', {
    supabaseUrl: url,
    keyPrefix,
    keyLen,
    isJwt,
    serviceKeyRef,
    serviceKeyRole,
    foundingCount: foundingRes.count,
    foundingError: foundingRes.error?.message ?? null,
    foundingRows: foundingRows.data,
    foundingRowsError: foundingRows.error?.message ?? null,
    piecesCount: piecesRes.count,
    piecesError: piecesRes.error?.message ?? null,
    artworkRows: artworkRows.data,
    artworkRowsError: artworkRows.error?.message ?? null,
    rawUsersFiltered,
    rawUsersAll,
    rawArtworksFiltered,
    rawArtworksAll,
    launchValue: launchRes.data?.value ?? null,
    at: new Date().toISOString(),
  });

  let daysUntilLaunch: number | null = null;
  const launchValue = launchRes.data?.value;
  if (launchValue) {
    const launchDate = new Date(launchValue);
    if (!Number.isNaN(launchDate.getTime())) {
      const msPerDay = 24 * 60 * 60 * 1000;
      daysUntilLaunch = Math.max(0, Math.ceil((launchDate.getTime() - Date.now()) / msPerDay));
    }
  }

  return {
    foundingArtists: foundingRes.count ?? 0,
    piecesToTrade: piecesRes.count ?? 0,
    daysUntilLaunch,
  };
}
