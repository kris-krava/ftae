import { supabaseAdmin } from '@/lib/supabase/admin';

export interface LandingStats {
  foundingArtists: number;
  piecesToTrade: number;
  daysUntilLaunch: number | null;
}

export async function getLandingStats(): Promise<LandingStats> {
  const [foundingRes, piecesRes, launchRes] = await Promise.all([
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
  ]);

  // TEMP DIAGNOSTIC — remove after debugging stale stats issue
  console.log('[landing-stats]', {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    foundingCount: foundingRes.count,
    foundingError: foundingRes.error?.message ?? null,
    piecesCount: piecesRes.count,
    piecesError: piecesRes.error?.message ?? null,
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
