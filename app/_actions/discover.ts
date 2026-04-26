'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchArtworksPage, type DiscoverArtwork } from '@/app/_lib/artworks';
import { searchArtists, followingSet, type DiscoverArtist } from '@/app/_lib/artists';
import { getArtworkDetail, isFollowing, type ArtworkDetail } from '@/app/_lib/profile';

export interface ArtworkModalPayload {
  artwork: ArtworkDetail;
  initialFollowing: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
}

export async function fetchArtworkModal(artworkId: string): Promise<ArtworkModalPayload | null> {
  const artwork = await getArtworkDetail(artworkId);
  if (!artwork) return null;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const isOwner = Boolean(authUser && authUser.id === artwork.user_id);
  const initialFollowing =
    !isOwner && authUser ? await isFollowing(authUser.id, artwork.user_id) : false;

  return {
    artwork,
    initialFollowing,
    isAuthenticated: Boolean(authUser),
    isOwner,
  };
}

export interface ArtworksPageResult {
  items: DiscoverArtwork[];
  nextCursor: string | null;
}

export async function loadMoreArtworks(cursor: string | null): Promise<ArtworksPageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let viewerIsTest = false;
  if (user) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('is_test_user')
      .eq('id', user.id)
      .single();
    viewerIsTest = Boolean(data?.is_test_user);
  }
  return fetchArtworksPage(cursor, { scope: viewerIsTest ? 'test' : 'real' });
}

export interface ArtistsSearchResult {
  items: (DiscoverArtist & { is_following: boolean })[];
  nextCursor: string | null;
}

export async function searchArtistsAction(query: string, cursor: string | null): Promise<ArtistsSearchResult> {
  const supabase = await createClient();
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
