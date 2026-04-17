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
  let serviceKeyRef: string | null = null;
  let serviceKeyRole: string | null = null;
  try {
    const segment = process.env.SUPABASE_SERVICE_ROLE_KEY?.split('.')[1];
    if (segment) {
      const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4);
      const json = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
      serviceKeyRef = json.ref ?? null;
      serviceKeyRole = json.role ?? null;
    }
  } catch (e) {
    serviceKeyRef = `decode-error: ${(e as Error).message}`;
  }

  console.log('[landing-stats]', {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
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
