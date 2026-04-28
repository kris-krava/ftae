import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchArtworksPage, fetchMediumsList } from '@/app/_lib/artworks';
import { bookmarkedSet } from '@/app/_lib/bookmarks';
import { getReferralUrl } from '@/lib/referral-server';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DiscoverClient } from './DiscoverClient';

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: viewer } = await supabaseAdmin
    .from('users')
    .select('is_test_user, referral_code')
    .eq('id', user.id)
    .single();
  const viewerIsTest = Boolean(viewer?.is_test_user);

  const [{ items, nextCursor }, mediumsList, params] = await Promise.all([
    fetchArtworksPage(null, { scope: viewerIsTest ? 'test' : 'real' }),
    fetchMediumsList(),
    searchParams,
  ]);

  const initialBookmarkedIds = Array.from(
    await bookmarkedSet(user.id, items.map((a) => a.id)),
  );
  const referralUrl = viewer?.referral_code ? await getReferralUrl(viewer.referral_code) : null;
  const initialQuery = (params.q ?? '').slice(0, 80);

  return (
    <main className="bg-canvas flex-1 w-full">
      <ErrorBoundary label="discover">
        <DiscoverClient
          initialArtworks={items}
          initialCursor={nextCursor}
          initialBookmarkedIds={initialBookmarkedIds}
          mediumsList={mediumsList}
          initialQuery={initialQuery}
          viewerId={user.id}
          isAuthenticated
          referralUrl={referralUrl}
        />
      </ErrorBoundary>
    </main>
  );
}
