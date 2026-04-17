import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface DiscoverArtwork {
  id: string;
  title: string | null;
  user_id: string;
  artist_username: string;
  artist_name: string | null;
  primary_photo_url: string | null;
  created_at: string;
}

const PAGE_SIZE = 24;

export async function fetchArtworksPage(cursor: string | null): Promise<{
  items: DiscoverArtwork[];
  nextCursor: string | null;
}> {
  let query = supabaseAdmin
    .from('artworks')
    .select(
      'id, title, user_id, created_at, users!inner(username, name, is_active), artwork_photos(url, sort_order, photo_type)',
    )
    .eq('is_active', true)
    .eq('users.is_active', true)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

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
    artwork_photos: { url: string; sort_order: number; photo_type: string }[] | null;
  }>;

  const items: DiscoverArtwork[] = rows.slice(0, PAGE_SIZE).map((row) => {
    const photos = row.artwork_photos ?? [];
    const front = photos.find((p) => p.photo_type === 'front');
    const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
    const primary = front ?? sorted[0];
    return {
      id: row.id,
      title: row.title,
      user_id: row.user_id,
      artist_username: row.users.username,
      artist_name: row.users.name,
      primary_photo_url: primary?.url ?? null,
      created_at: row.created_at,
    };
  });

  const nextCursor = rows.length > PAGE_SIZE ? items[items.length - 1].created_at : null;
  return { items, nextCursor };
}
