import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface ProfileUser {
  id: string;
  email: string;
  username: string;
  name: string | null;
  location_city: string | null;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  social_platform: string | null;
  social_handle: string | null;
  is_founding_member: boolean;
  studio_verified: boolean;
  is_active: boolean;
}

export interface ProfileMedium {
  id: string;
  name: string;
  sort_order: number;
}

export interface ProfileArtwork {
  id: string;
  title: string | null;
  primary_photo_url: string | null;
  proposal_count: number;
}

export async function getUserByUsername(username: string): Promise<ProfileUser | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select(
      'id, email, username, name, location_city, bio, avatar_url, website_url, social_platform, social_handle, is_founding_member, studio_verified, is_active',
    )
    .eq('username', username)
    .eq('is_active', true)
    .maybeSingle();
  return (data ?? null) as ProfileUser | null;
}

export async function getUserMediums(userId: string): Promise<ProfileMedium[]> {
  const { data } = await supabaseAdmin
    .from('user_mediums')
    .select('mediums(id, name, sort_order)')
    .eq('user_id', userId);
  if (!data) return [];
  const mediums = data
    .map((row) => (row as unknown as { mediums: ProfileMedium | null }).mediums)
    .filter((m): m is ProfileMedium => Boolean(m));
  mediums.sort((a, b) => a.sort_order - b.sort_order);
  return mediums;
}

// Hard cap. Profile artwork grid currently fetches the first page only.
// V1 expects users with ≤8 artworks; bumping cap to 60 leaves headroom before
// pagination is required.
const PROFILE_ARTWORK_LIMIT = 60;

export async function getUserArtworks(userId: string): Promise<ProfileArtwork[]> {
  const { data } = await supabaseAdmin
    .from('artworks')
    .select('id, title, artwork_photos(url, sort_order, photo_type)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(PROFILE_ARTWORK_LIMIT);
  if (!data) return [];
  return data.map((row) => {
    const photos = (row as unknown as {
      artwork_photos: { url: string; sort_order: number; photo_type: string }[] | null;
    }).artwork_photos ?? [];
    const front = photos.find((p) => p.photo_type === 'front');
    const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
    const primary = front ?? sorted[0];
    return {
      id: row.id as string,
      title: row.title as string | null,
      primary_photo_url: primary?.url ?? null,
      proposal_count: 0,
    };
  });
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  return Boolean(data);
}
