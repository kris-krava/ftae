'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchArtworksPage, type DiscoverArtwork } from '@/app/_lib/artworks';
import { searchArtists, followingSet, type DiscoverArtist } from '@/app/_lib/artists';
import { getArtworkDetail, isFollowing, type ArtworkDetail } from '@/app/_lib/profile';
import { bookmarkedSet, isBookmarked } from '@/app/_lib/bookmarks';
import { rateLimit } from '@/lib/rate-limit';

export interface ArtworkModalPayload {
  artwork: ArtworkDetail;
  initialFollowing: boolean;
  initialBookmarked: boolean;
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
  const [initialFollowing, initialBookmarked] = await Promise.all([
    !isOwner && authUser ? isFollowing(authUser.id, artwork.user_id) : Promise.resolve(false),
    !isOwner && authUser ? isBookmarked(authUser.id, artwork.id) : Promise.resolve(false),
  ]);

  return {
    artwork,
    initialFollowing,
    initialBookmarked,
    isAuthenticated: Boolean(authUser),
    isOwner,
  };
}

export interface ArtworksPageResult {
  items: DiscoverArtwork[];
  nextCursor: string | null;
  /** Subset of items the viewer has bookmarked (empty for unauthenticated). */
  bookmarkedIds: string[];
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
  const page = await fetchArtworksPage(cursor, { scope: viewerIsTest ? 'test' : 'real' });
  const ids = user ? Array.from(await bookmarkedSet(user.id, page.items.map((a) => a.id))) : [];
  return { ...page, bookmarkedIds: ids };
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

  // Rate-limit per viewer (or per IP if signed out) — 60 searches/min covers a
  // very twitchy typist (~1/sec) without leaving room for scripted abuse.
  let limitKey: string;
  if (user) {
    limitKey = `search:${user.id}`;
  } else {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? 'unknown';
    limitKey = `search:ip:${ip}`;
  }
  const limit = await rateLimit(limitKey, 60, 60_000);
  if (!limit.ok) return { items: [], nextCursor: null };

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
