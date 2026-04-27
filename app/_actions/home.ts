'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchArtworksPage, type DiscoverArtwork } from '@/app/_lib/artworks';
import { followedUserIds } from '@/app/_lib/artists';
import { bookmarkedSet } from '@/app/_lib/bookmarks';

export interface HomeFeedPageResult {
  items: DiscoverArtwork[];
  nextCursor: string | null;
  bookmarkedIds: string[];
}

export async function loadMoreHomeFeed(cursor: string | null): Promise<HomeFeedPageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], nextCursor: null, bookmarkedIds: [] };

  const { data: viewer } = await supabaseAdmin
    .from('users')
    .select('is_test_user')
    .eq('id', user.id)
    .single();
  const scope = viewer?.is_test_user ? 'test' : 'real';

  const userIds = await followedUserIds(user.id);
  const page = await fetchArtworksPage(cursor, { scope, userIds });
  const ids = Array.from(await bookmarkedSet(user.id, page.items.map((a) => a.id)));
  return { ...page, bookmarkedIds: ids };
}
