import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface OnboardingProfile {
  id: string;
  email: string;
  username: string;
  name: string | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  social_platform: string | null;
  social_handle: string | null;
  is_founding_member: boolean;
  referral_code: string | null;
  profile_completion_pct: number;
}

export async function requireOnboardingUser(): Promise<{
  userId: string;
  email: string;
  profile: OnboardingProfile;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select(
      'id, email, username, name, location_city, location_region, location_country, bio, avatar_url, website_url, social_platform, social_handle, is_founding_member, referral_code, profile_completion_pct',
    )
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/');

  return { userId: user.id, email: user.email ?? profile.email, profile: profile as OnboardingProfile };
}

export async function getUserMediumIds(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('user_mediums')
    .select('medium_id')
    .eq('user_id', userId);
  return (data ?? []).map((row) => row.medium_id as string);
}

export async function getMediums(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabaseAdmin
    .from('mediums')
    .select('id, name')
    .order('sort_order', { ascending: true });
  return (data ?? []) as { id: string; name: string }[];
}

export async function getArtworkCount(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('artworks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);
  return count ?? 0;
}
