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
      .eq('is_active', true)
      .eq('is_test_user', false),
    supabaseAdmin
      .from('artworks')
      .select('id, users!inner(is_test_user)', { count: 'exact', head: true })
      .eq('is_trade_available', true)
      .eq('is_active', true)
      .eq('users.is_test_user', false),
    supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', 'launch_date')
      .maybeSingle(),
  ]);

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
