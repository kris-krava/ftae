import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface BookmarkedPiece {
  id: string;
  title: string | null;
  photo_url: string | null;
  photo_focal_x: number | null;
  photo_focal_y: number | null;
}

export interface BookmarkedArtistGroup {
  artist: {
    id: string;
    username: string;
    name: string | null;
    avatar_url: string | null;
    avatar_focal_x: number | null;
    avatar_focal_y: number | null;
    avatar_aspect_ratio: number | null;
    location_city: string | null;
    location_region: string | null;
    is_founding_member: boolean;
  };
  pieces: BookmarkedPiece[];
}

/**
 * Returns the subset of `ids` the viewer has bookmarked. Used to enrich
 * artwork grids (Discover, Home, Profile-other-user) with the saved state
 * without N+1 lookups. Empty input → empty set.
 */
export async function bookmarkedSet(
  viewerId: string,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await supabaseAdmin
    .from('artwork_bookmarks')
    .select('artwork_id')
    .eq('user_id', viewerId)
    .in('artwork_id', ids);
  return new Set((data ?? []).map((r) => r.artwork_id as string));
}

/**
 * Single-artwork bookmark check, used to seed `initialBookmarked` in the
 * modal payload. For grids prefer `bookmarkedSet` to avoid round-trips.
 */
export async function isBookmarked(
  viewerId: string,
  artworkId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('artwork_bookmarks')
    .select('id')
    .eq('user_id', viewerId)
    .eq('artwork_id', artworkId)
    .maybeSingle();
  return Boolean(data);
}

interface RawBookmarkRow {
  artwork_id: string;
  created_at: string;
  artwork: {
    id: string;
    title: string | null;
    is_active: boolean;
    user_id: string;
    artist: {
      id: string;
      username: string;
      name: string | null;
      avatar_url: string | null;
      avatar_focal_x: number | null;
      avatar_focal_y: number | null;
      avatar_aspect_ratio: number | null;
      location_city: string | null;
      location_region: string | null;
      is_founding_member: boolean;
    } | null;
    photos: { url: string | null; sort_order: number }[] | null;
  } | null;
}

/**
 * Returns the viewer's bookmarks bucketed by artist for the Trades page.
 *
 * - Inactive (soft-deleted) artworks are excluded.
 * - Within an artist group, pieces are ordered newest-bookmarked first.
 * - Across the page, artist groups are ordered by each artist's most
 *   recently bookmarked piece (so a fresh save bumps that artist to the top).
 * - Each piece returns its first photo (by sort_order) for thumbnail use.
 */
export async function getBookmarksGroupedByArtist(
  viewerId: string,
): Promise<BookmarkedArtistGroup[]> {
  const { data, error } = await supabaseAdmin
    .from('artwork_bookmarks')
    .select(
      `
      artwork_id,
      created_at,
      artwork:artworks!inner (
        id,
        title,
        is_active,
        user_id,
        artist:users!inner (
          id,
          username,
          name,
          avatar_url,
          avatar_focal_x,
          avatar_focal_y,
          avatar_aspect_ratio,
          location_city,
          location_region,
          is_founding_member
        ),
        photos:artwork_photos (
          url,
          sort_order
        )
      )
    `,
    )
    .eq('user_id', viewerId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const rows = data as unknown as RawBookmarkRow[];
  const groups = new Map<string, BookmarkedArtistGroup>();
  const groupOrder: string[] = [];

  for (const row of rows) {
    const art = row.artwork;
    if (!art || !art.is_active || !art.artist) continue;

    const sortedPhotos = (art.photos ?? [])
      .filter((p) => p.url)
      .sort((a, b) => a.sort_order - b.sort_order);
    const cover = sortedPhotos[0] ?? null;

    const piece: BookmarkedPiece = {
      id: art.id,
      title: art.title,
      photo_url: cover?.url ?? null,
      photo_focal_x: null,
      photo_focal_y: null,
    };

    const artistId = art.artist.id;
    let group = groups.get(artistId);
    if (!group) {
      group = { artist: art.artist, pieces: [] };
      groups.set(artistId, group);
      groupOrder.push(artistId);
    }
    group.pieces.push(piece);
  }

  return groupOrder.map((id) => groups.get(id)!);
}
