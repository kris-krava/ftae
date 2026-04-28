'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  fetchArtworksPage,
  searchArtworks,
  type DiscoverArtwork,
} from '@/app/_lib/artworks';
import { searchArtists, followingSet, type SearchArtistResult } from '@/app/_lib/artists';
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

async function viewerIsTestUser(viewerId: string | null): Promise<boolean> {
  if (!viewerId) return false;
  const { data } = await supabaseAdmin
    .from('users')
    .select('is_test_user')
    .eq('id', viewerId)
    .single();
  return Boolean(data?.is_test_user);
}

export async function loadMoreArtworks(cursor: string | null): Promise<ArtworksPageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerIsTest = await viewerIsTestUser(user?.id ?? null);
  const page = await fetchArtworksPage(cursor, { scope: viewerIsTest ? 'test' : 'real' });
  const ids = user ? Array.from(await bookmarkedSet(user.id, page.items.map((a) => a.id))) : [];
  return { ...page, bookmarkedIds: ids };
}

export interface ArtistsSearchResult {
  items: (SearchArtistResult & { is_following: boolean })[];
  nextCursor: string | null;
}

/**
 * Resolves the rate-limit key used by both search actions. Keyed per viewer
 * when authenticated; per IP otherwise. Both artist + artwork search share
 * the same key prefix so a fast typist can't fan out 2× the limit.
 */
async function searchLimitKey(viewerId: string | null): Promise<string> {
  if (viewerId) return `search:${viewerId}`;
  const h = await headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? 'unknown';
  return `search:ip:${ip}`;
}

export async function searchArtistsAction(
  query: string,
  cursor: string | null,
): Promise<ArtistsSearchResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 60 searches/min covers a twitchy typist (~1/sec) without leaving room
  // for scripted abuse. Shared key prefix with searchArtworksAction.
  const limit = await rateLimit(await searchLimitKey(user?.id ?? null), 60, 60_000);
  if (!limit.ok) return { items: [], nextCursor: null };

  const viewerIsTest = await viewerIsTestUser(user?.id ?? null);
  const { items, nextCursor } = await searchArtists(query, cursor, {
    scope: viewerIsTest ? 'test' : 'real',
  });
  if (!user) {
    return { items: items.map((a) => ({ ...a, is_following: false })), nextCursor };
  }
  const followIds = await followingSet(user.id, items.map((a) => a.id));
  return {
    items: items.map((a) => ({ ...a, is_following: followIds.has(a.id) })),
    nextCursor,
  };
}

export interface ArtworksSearchResult {
  items: DiscoverArtwork[];
  nextCursor: string | null;
  /** Subset of items the viewer has bookmarked (empty for unauthenticated). */
  bookmarkedIds: string[];
}

export async function searchArtworksAction(
  query: string,
  cursor: string | null,
): Promise<ArtworksSearchResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const limit = await rateLimit(await searchLimitKey(user?.id ?? null), 60, 60_000);
  if (!limit.ok) return { items: [], nextCursor: null, bookmarkedIds: [] };

  const viewerIsTest = await viewerIsTestUser(user?.id ?? null);
  const { items, nextCursor } = await searchArtworks(query, cursor, {
    scope: viewerIsTest ? 'test' : 'real',
  });
  const bookmarkedIds = user
    ? Array.from(await bookmarkedSet(user.id, items.map((a) => a.id)))
    : [];
  return { items, nextCursor, bookmarkedIds };
}
