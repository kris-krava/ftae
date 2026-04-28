import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_QUERY_LENGTH } from '@/lib/search-constants';
import { deriveInitials } from '@/lib/initials';

export interface ArtworkPreview {
  id: string;
  primary_photo_url: string | null;
  primary_photo_focal_x: number;
  primary_photo_focal_y: number;
}

export interface SearchArtistResult {
  id: string;
  username: string;
  name: string | null;
  location_city: string | null;
  is_founding_member: boolean;
  studio_verified: boolean;
  avatar_url: string | null;
  /** Pre-computed so we don't ship `email` to the client purely as an initial fallback. */
  initial: string;
  /** Distinct mediums of pieces matching the query — empty when the query didn't hit any artwork medium. */
  matched_mediums: string[];
  /** Up to 3 thumbnails: matched-medium pieces first, then created_at DESC. */
  artwork_previews: ArtworkPreview[];
}

const PAGE_SIZE = 20;
// Soft cap on the pre-pagination union — well above current scale (~tens of users)
// while keeping the per-search payload bounded. Revisit when active users cross
// the low hundreds and switch to a single SQL union.
const UNION_CAP = 200;

export async function searchArtists(
  query: string,
  cursor: string | null,
  options: { scope?: 'real' | 'test' } = {},
): Promise<{ items: SearchArtistResult[]; nextCursor: string | null }> {
  const trimmed = query.trim();
  if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) return { items: [], nextCursor: null };
  if (trimmed.length > SEARCH_MAX_QUERY_LENGTH) return { items: [], nextCursor: null };
  // Escape PostgREST/SQL ILIKE wildcards so a literal `%` in the input doesn't
  // turn into a wildcard match. The leading `\` is interpreted by Postgres'
  // ILIKE escape clause (default `\`).
  const safe = trimmed.replace(/[%_]/g, '\\$&');
  const pattern = `%${safe}%`;
  // Test viewers see test-user content, real viewers see real-user content —
  // matches `fetchArtworksPage`'s scoping so search is consistent with the
  // feed instead of always filtering test users out.
  const isTestScope = options.scope === 'test';

  // Leg 1: users matched on name OR username OR location_city. The OR string
  // goes straight into PostgREST so the column tokens must match exactly.
  const { data: byUserField } = await supabaseAdmin
    .from('users')
    .select(
      'id, username, name, location_city, is_founding_member, studio_verified, avatar_url, email, created_at',
    )
    .eq('is_active', true)
    .eq('is_test_user', isTestScope)
    .or(`name.ilike.${pattern},username.ilike.${pattern},location_city.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(UNION_CAP);

  // Leg 2: per-piece medium leg. Distinct user_ids whose active artwork has
  // a medium matching the query. Replaces the old `user_mediums` join so
  // posted-art is the source of truth — see project_ftae_search memory.
  // The post-fetch hydration step filters by is_test_user so test-only
  // artwork doesn't surface a real artist (or vice versa).
  const { data: mediumMatchedRows } = await supabaseAdmin
    .from('artworks')
    .select('user_id')
    .eq('is_active', true)
    .ilike('medium', pattern)
    .limit(UNION_CAP * 4);

  const knownIds = new Set((byUserField ?? []).map((u) => u.id as string));
  const mediumOnlyIds = Array.from(
    new Set(
      ((mediumMatchedRows ?? []).map((r) => r.user_id as string)).filter((id) => !knownIds.has(id)),
    ),
  );

  type UserRow = {
    id: string;
    username: string;
    name: string | null;
    location_city: string | null;
    is_founding_member: boolean;
    studio_verified: boolean;
    avatar_url: string | null;
    email: string;
    created_at: string;
  };

  let mediumOnlyRows: UserRow[] = [];
  if (mediumOnlyIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('users')
      .select(
        'id, username, name, location_city, is_founding_member, studio_verified, avatar_url, email, created_at',
      )
      .eq('is_active', true)
      .eq('is_test_user', isTestScope)
      .in('id', mediumOnlyIds);
    mediumOnlyRows = (data ?? []) as UserRow[];
  }

  const merged = new Map<string, UserRow>();
  for (const u of (byUserField ?? []) as UserRow[]) merged.set(u.id, u);
  for (const u of mediumOnlyRows) merged.set(u.id, u);

  const all = Array.from(merged.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  const cursored = cursor ? all.filter((u) => u.created_at < cursor) : all;
  const pageRaw = cursored.slice(0, PAGE_SIZE);
  const nextCursor =
    cursored.length > PAGE_SIZE ? pageRaw[pageRaw.length - 1].created_at : null;

  if (pageRaw.length === 0) return { items: [], nextCursor: null };

  const ids = pageRaw.map((u) => u.id);

  // Enrich the page with up to 3 artwork previews per artist. We pull all
  // active pieces for the page in one query, then split per-user into
  // matched-medium first / others second. This bounds us to one round-trip
  // for the previews regardless of page size.
  const { data: artworkRows } = await supabaseAdmin
    .from('artworks')
    .select(
      'id, user_id, medium, created_at, artwork_photos(url, sort_order, focal_x, focal_y)',
    )
    .eq('is_active', true)
    .in('user_id', ids)
    .order('created_at', { ascending: false });

  // Substring (case-insensitive) — same semantics as the SQL ILIKE leg, used
  // here only to bucket matched vs. other pieces for the priority sort.
  const matchedNeedle = trimmed.toLowerCase();

  type ArtworkRow = {
    id: string;
    user_id: string;
    medium: string | null;
    created_at: string;
    artwork_photos:
      | { url: string; sort_order: number; focal_x: number; focal_y: number }[]
      | null;
  };

  const piecesByUser = new Map<string, ArtworkRow[]>();
  for (const row of (artworkRows ?? []) as ArtworkRow[]) {
    const arr = piecesByUser.get(row.user_id) ?? [];
    arr.push(row);
    piecesByUser.set(row.user_id, arr);
  }

  const toPreview = (row: ArtworkRow): ArtworkPreview => {
    const primary = (row.artwork_photos ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: row.id,
      primary_photo_url: primary?.url ?? null,
      primary_photo_focal_x: primary?.focal_x ?? 0.5,
      primary_photo_focal_y: primary?.focal_y ?? 0.5,
    };
  };

  const items: SearchArtistResult[] = pageRaw.map((u) => {
    const pieces = piecesByUser.get(u.id) ?? [];
    const matched: ArtworkRow[] = [];
    const others: ArtworkRow[] = [];
    for (const p of pieces) {
      if (p.medium && p.medium.toLowerCase().includes(matchedNeedle)) matched.push(p);
      else others.push(p);
    }
    const previews = [...matched, ...others].slice(0, 3).map(toPreview);
    const matched_mediums = Array.from(
      new Set(
        matched
          .map((p) => p.medium)
          .filter((m): m is string => Boolean(m && m.trim())),
      ),
    );
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      location_city: u.location_city,
      is_founding_member: u.is_founding_member,
      studio_verified: u.studio_verified,
      avatar_url: u.avatar_url,
      initial: deriveInitials(u.name, u.email),
      matched_mediums,
      artwork_previews: previews,
    };
  });

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
