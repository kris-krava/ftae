'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchArtworksPage, type DiscoverArtwork } from '@/app/_lib/artworks';
import { followedUserIds } from '@/app/_lib/artists';

export interface HomeFeedPageResult {
  items: DiscoverArtwork[];
  nextCursor: string | null;
}

export async function loadMoreHomeFeed(cursor: string | null): Promise<HomeFeedPageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], nextCursor: null };

  const { data: viewer } = await supabaseAdmin
    .from('users')
    .select('is_test_user')
    .eq('id', user.id)
    .single();
  const scope = viewer?.is_test_user ? 'test' : 'real';

  const userIds = await followedUserIds(user.id);
  return fetchArtworksPage(cursor, { scope, userIds });
}
