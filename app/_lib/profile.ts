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
  avatar_focal_x: number;
  avatar_focal_y: number;
  avatar_aspect_ratio: number | null;
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
  primary_photo_focal_x: number;
  primary_photo_focal_y: number;
  proposal_count: number;
}

export async function getUserByUsername(username: string): Promise<ProfileUser | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select(
      'id, email, username, name, location_city, bio, avatar_url, avatar_focal_x, avatar_focal_y, avatar_aspect_ratio, website_url, social_platform, social_handle, is_founding_member, studio_verified, is_active',
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
    .select('id, title, artwork_photos(url, sort_order, focal_x, focal_y)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(PROFILE_ARTWORK_LIMIT);
  if (!data) return [];
  return data.map((row) => {
    const photos = (row as unknown as {
      artwork_photos:
        | { url: string; sort_order: number; focal_x: number; focal_y: number }[]
        | null;
    }).artwork_photos ?? [];
    const primary = [...photos].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: row.id as string,
      title: row.title as string | null,
      primary_photo_url: primary?.url ?? null,
      primary_photo_focal_x: primary?.focal_x ?? 0.5,
      primary_photo_focal_y: primary?.focal_y ?? 0.5,
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

export interface ArtworkPhoto {
  id: string;
  url: string;
  sort_order: number;
  focal_x: number;
  focal_y: number;
}

export interface ArtworkArtist {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
  avatar_focal_x: number | null;
  avatar_focal_y: number | null;
  avatar_aspect_ratio: number | null;
  is_founding_member: boolean;
}

export interface ArtworkDetail {
  id: string;
  user_id: string;
  title: string | null;
  year: number | null;
  medium: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  description: string | null;
  created_at: string;
  photos: ArtworkPhoto[];
  artist: ArtworkArtist;
}

export async function getArtworkDetail(artworkId: string): Promise<ArtworkDetail | null> {
  const { data } = await supabaseAdmin
    .from('artworks')
    .select(
      `id, user_id, title, year, medium, width, height, depth, description:artist_statement, created_at,
       artwork_photos(id, url, sort_order, focal_x, focal_y),
       users:user_id ( id, username, name, avatar_url, avatar_focal_x, avatar_focal_y, avatar_aspect_ratio, is_founding_member )`,
    )
    .eq('id', artworkId)
    .eq('is_active', true)
    .maybeSingle();
  if (!data) return null;

  const rawPhotos =
    ((data as unknown as { artwork_photos: ArtworkPhoto[] | null }).artwork_photos ?? []);
  const photos = [...rawPhotos].sort((a, b) => a.sort_order - b.sort_order);

  const artist = (data as unknown as { users: ArtworkArtist | null }).users;
  if (!artist) return null;

  return {
    id: data.id as string,
    user_id: data.user_id as string,
    title: data.title as string | null,
    year: data.year as number | null,
    medium: data.medium as string | null,
    width: data.width as number | null,
    height: data.height as number | null,
    depth: data.depth as number | null,
    description: data.description as string | null,
    created_at: data.created_at as string,
    photos,
    artist: {
      id: artist.id,
      username: artist.username,
      name: artist.name,
      avatar_url: artist.avatar_url,
      avatar_focal_x: artist.avatar_focal_x,
      avatar_focal_y: artist.avatar_focal_y,
      avatar_aspect_ratio: artist.avatar_aspect_ratio,
      is_founding_member: artist.is_founding_member,
    },
  };
}

export async function getArtworkNeighbors(
  userId: string,
  artworkId: string,
): Promise<{ prev: string | null; next: string | null }> {
  const { data } = await supabaseAdmin
    .from('artworks')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(PROFILE_ARTWORK_LIMIT);
  if (!data) return { prev: null, next: null };
  const idx = data.findIndex((row) => row.id === artworkId);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? (data[idx - 1].id as string) : null,
    next: idx < data.length - 1 ? (data[idx + 1].id as string) : null,
  };
}
