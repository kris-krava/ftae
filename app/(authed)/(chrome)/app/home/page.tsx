import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchArtworksPage } from '@/app/_lib/artworks';
import { followedUserIds } from '@/app/_lib/artists';
import { bookmarkedSet } from '@/app/_lib/bookmarks';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Home02 } from '@/components/icons';
import { HomeFeedClient } from './HomeFeedClient';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: viewer } = await supabaseAdmin
    .from('users')
    .select('is_test_user')
    .eq('id', user.id)
    .single();
  const scope = viewer?.is_test_user ? 'test' : 'real';

  const userIds = await followedUserIds(user.id);
  const initial = await fetchArtworksPage(null, { scope, userIds });

  if (initial.items.length === 0) {
    return <EmptyState followingNobody={userIds.length === 0} />;
  }

  const initialBookmarkedIds = Array.from(
    await bookmarkedSet(user.id, initial.items.map((a) => a.id)),
  );

  return (
    <main className="bg-canvas flex-1 w-full">
      <ErrorBoundary label="home-feed">
        <HomeFeedClient
          initialArtworks={initial.items}
          initialCursor={initial.nextCursor}
          initialBookmarkedIds={initialBookmarkedIds}
          viewerId={user.id}
        />
      </ErrorBoundary>
    </main>
  );
}

function EmptyState({ followingNobody }: { followingNobody: boolean }) {
  return (
    <main className="bg-canvas flex-1 w-full flex flex-col items-center justify-center px-[32px]">
      <div className="flex items-center justify-center w-[96px] h-[96px] rounded-full bg-accent/10">
        <Home02 className="w-[48px] h-[48px] text-accent" />
      </div>
      <h1 className="font-serif font-bold text-ink text-center text-[24px] mt-[24px]">
        Your Home Feed
      </h1>
      <p className="font-sans text-muted text-center text-[15px] leading-[24px] mt-[12px]">
        {followingNobody
          ? 'Follow artists to see new work from them here.'
          : 'No new work yet from the artists you follow.'}
      </p>
      <Link
        href="/app/discover"
        className="mt-[24px] inline-flex items-center justify-center rounded-[8px] bg-accent px-[24px] h-[48px] font-sans font-semibold text-[16px] leading-[24px] text-surface"
      >
        Discover Artists
      </Link>
    </main>
  );
}
