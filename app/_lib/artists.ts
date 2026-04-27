import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface DiscoverArtist {
  id: string;
  username: string;
  name: string | null;
  location_city: string | null;
  is_founding_member: boolean;
  studio_verified: boolean;
  avatar_url: string | null;
  email: string;
  mediums: string[];
  pieces_count: number;
  trades_count: number;
}

import { SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_QUERY_LENGTH } from '@/lib/search-constants';

const PAGE_SIZE = 20;

export async function searchArtists(
  query: string,
  cursor: string | null,
): Promise<{ items: DiscoverArtist[]; nextCursor: string | null }> {
  const trimmed = query.trim();
  if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) return { items: [], nextCursor: null };
  if (trimmed.length > SEARCH_MAX_QUERY_LENGTH) return { items: [], nextCursor: null };
  const safe = trimmed.replace(/[%_]/g, '\\$&');

  // Match users whose name or username contains the query, OR who have a medium matching it.
  const { data: byNameOrUsername } = await supabaseAdmin
    .from('users')
    .select('id, username, name, location_city, is_founding_member, studio_verified, avatar_url, email, created_at')
    .eq('is_active', true)
    .eq('is_test_user', false)
    .or(`name.ilike.%${safe}%,username.ilike.%${safe}%`)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  const { data: byMedium } = await supabaseAdmin
    .from('user_mediums')
    .select('users!inner(id, username, name, location_city, is_founding_member, studio_verified, avatar_url, email, created_at, is_active, is_test_user), mediums!inner(name)')
    .ilike('mediums.name', `%${safe}%`)
    .eq('users.is_test_user', false)
    .limit(PAGE_SIZE + 1);

  const matchedById = new Map<string, DiscoverArtist>();
  const recordedAt = new Map<string, string>();

  function addUser(u: {
    id: string;
    username: string;
    name: string | null;
    location_city: string | null;
    is_founding_member: boolean;
    studio_verified: boolean;
    avatar_url: string | null;
    email: string;
    created_at: string;
  }) {
    if (matchedById.has(u.id)) return;
    matchedById.set(u.id, {
      id: u.id,
      username: u.username,
      name: u.name,
      location_city: u.location_city,
      is_founding_member: u.is_founding_member,
      studio_verified: u.studio_verified,
      avatar_url: u.avatar_url,
      email: u.email,
      mediums: [],
      pieces_count: 0,
      trades_count: 0,
    });
    recordedAt.set(u.id, u.created_at);
  }

  (byNameOrUsername ?? []).forEach(addUser);
  (byMedium ?? []).forEach((row) => {
    const u = (row as unknown as { users: Parameters<typeof addUser>[0] & { is_active: boolean } }).users;
    if (u && u.is_active) addUser(u);
  });

  const all = Array.from(matchedById.values());
  all.sort((a, b) => (recordedAt.get(b.id) ?? '').localeCompare(recordedAt.get(a.id) ?? ''));

  // Apply cursor (created_at-based)
  let pageItems = all;
  if (cursor) {
    pageItems = all.filter((a) => (recordedAt.get(a.id) ?? '') < cursor);
  }
  const items = pageItems.slice(0, PAGE_SIZE);

  // Fetch mediums + counts for the page
  if (items.length > 0) {
    const ids = items.map((a) => a.id);
    const [mediumsRes, artworkCountRes, tradeCountRes] = await Promise.all([
      supabaseAdmin
        .from('user_mediums')
        .select('user_id, mediums(name, sort_order)')
        .in('user_id', ids),
      supabaseAdmin
        .from('artworks')
        .select('user_id', { count: 'exact', head: false })
        .in('user_id', ids)
        .eq('is_active', true),
      supabaseAdmin
        .from('trades')
        .select('initiator_id, recipient_id')
        .in('status', ['accepted', 'completed', 'shipped'])
        .or(`initiator_id.in.(${ids.join(',')}),recipient_id.in.(${ids.join(',')})`),
    ]);

    const mediumsByUser = new Map<string, string[]>();
    for (const row of mediumsRes.data ?? []) {
      const r = row as unknown as { user_id: string; mediums: { name: string; sort_order: number } | null };
      if (!r.mediums) continue;
      const arr = mediumsByUser.get(r.user_id) ?? [];
      arr.push(r.mediums.name);
      mediumsByUser.set(r.user_id, arr);
    }

    const piecesByUser = new Map<string, number>();
    for (const row of artworkCountRes.data ?? []) {
      const r = row as unknown as { user_id: string };
      piecesByUser.set(r.user_id, (piecesByUser.get(r.user_id) ?? 0) + 1);
    }

    const tradesByUser = new Map<string, number>();
    for (const row of tradeCountRes.data ?? []) {
      const r = row as unknown as { initiator_id: string; recipient_id: string };
      for (const id of [r.initiator_id, r.recipient_id]) {
        if (ids.includes(id)) tradesByUser.set(id, (tradesByUser.get(id) ?? 0) + 1);
      }
    }

    for (const item of items) {
      item.mediums = mediumsByUser.get(item.id) ?? [];
      item.pieces_count = piecesByUser.get(item.id) ?? 0;
      item.trades_count = tradesByUser.get(item.id) ?? 0;
    }
  }

  const nextCursor = pageItems.length > PAGE_SIZE
    ? recordedAt.get(items[items.length - 1].id) ?? null
    : null;
  return { items, nextCursor };
}

export async function followingSet(viewerId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await supabaseAdmin
    .from('follows')
    .select('following_id')
    .eq('follower_id', viewerId)
    .in('following_id', ids);
  return new Set((data ?? []).map((r) => r.following_id as string));
}

export async function followedUserIds(viewerId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('follows')
    .select('following_id')
    .eq('follower_id', viewerId);
  return (data ?? []).map((r) => r.following_id as string);
}
