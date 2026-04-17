import { supabaseAdmin } from '@/lib/supabase/admin';

export async function getDaysUntilLaunch(): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from('platform_settings')
    .select('value')
    .eq('key', 'launch_date')
    .maybeSingle();
  const launchValue = data?.value;
  if (!launchValue) return null;
  const launchDate = new Date(launchValue);
  if (Number.isNaN(launchDate.getTime())) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((launchDate.getTime() - Date.now()) / msPerDay));
}
