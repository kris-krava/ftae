'use server';

import { createClient } from '@/lib/supabase/server';
import { fetchArtworksPage, type DiscoverArtwork } from '@/app/_lib/artworks';
import { searchArtists, followingSet, type DiscoverArtist } from '@/app/_lib/artists';

export interface ArtworksPageResult {
  items: DiscoverArtwork[];
  nextCursor: string | null;
}

export async function loadMoreArtworks(cursor: string | null): Promise<ArtworksPageResult> {
  return fetchArtworksPage(cursor);
}

export interface ArtistsSearchResult {
  items: (DiscoverArtist & { is_following: boolean })[];
  nextCursor: string | null;
}

export async function searchArtistsAction(query: string, cursor: string | null): Promise<ArtistsSearchResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { items, nextCursor } = await searchArtists(query, cursor);
  if (!user) {
    return { items: items.map((a) => ({ ...a, is_following: false })), nextCursor };
  }
  const followIds = await followingSet(user.id, items.map((a) => a.id));
  return {
    items: items.map((a) => ({ ...a, is_following: followIds.has(a.id) })),
    nextCursor,
  };
}
