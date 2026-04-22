import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface DiscoverArtwork {
  id: string;
  title: string | null;
  user_id: string;
  artist_username: string;
  artist_name: string | null;
  primary_photo_url: string | null;
  primary_photo_focal_x: number;
  primary_photo_focal_y: number;
  created_at: string;
}

const PAGE_SIZE = 24;

export async function fetchArtworksPage(
  cursor: string | null,
  options: { scope?: 'real' | 'test'; userIds?: string[] } = {},
): Promise<{
  items: DiscoverArtwork[];
  nextCursor: string | null;
}> {
  const scope = options.scope ?? 'real';
  if (options.userIds && options.userIds.length === 0) {
    return { items: [], nextCursor: null };
  }
  let query = supabaseAdmin
    .from('artworks')
    .select(
      'id, title, user_id, created_at, users!inner(username, name, is_active, is_test_user), artwork_photos(url, sort_order, focal_x, focal_y)',
    )
    .eq('is_active', true)
    .eq('users.is_active', true)
    .eq('users.is_test_user', scope === 'test')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (options.userIds) {
    query = query.in('user_id', options.userIds);
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data } = await query;
  if (!data) return { items: [], nextCursor: null };

  const rows = data as unknown as Array<{
    id: string;
    title: string | null;
    user_id: string;
    created_at: string;
    users: { username: string; name: string | null };
    artwork_photos:
      | { url: string; sort_order: number; focal_x: number; focal_y: number }[]
      | null;
  }>;

  const items: DiscoverArtwork[] = rows.slice(0, PAGE_SIZE).map((row) => {
    const photos = row.artwork_photos ?? [];
    const primary = [...photos].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: row.id,
      title: row.title,
      user_id: row.user_id,
      artist_username: row.users.username,
      artist_name: row.users.name,
      primary_photo_url: primary?.url ?? null,
      primary_photo_focal_x: primary?.focal_x ?? 0.5,
      primary_photo_focal_y: primary?.focal_y ?? 0.5,
      created_at: row.created_at,
    };
  });

  const nextCursor = rows.length > PAGE_SIZE ? items[items.length - 1].created_at : null;
  return { items, nextCursor };
}
