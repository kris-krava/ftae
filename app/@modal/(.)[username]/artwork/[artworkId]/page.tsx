import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getArtworkDetail, getArtworkNeighbors, isFollowing } from '@/app/_lib/profile';
import { ArtworkDetailsModal } from '@/components/profile/ArtworkDetailsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const dynamic = 'force-dynamic';

interface Props {
  params: { username: string; artworkId: string };
}

// Root-level intercept: fires from anywhere in the app (Discover, Profile,
// direct deep link, etc.) and renders the Art Details modal over the current
// page without a full navigation.
export default async function ArtworkDetailsIntercept({ params }: Props) {
  noStore();
  try {
    const artwork = await getArtworkDetail(params.artworkId);
    if (!artwork) notFound();
    if (artwork.artist.username !== params.username.toLowerCase()) notFound();

    const neighbors = await getArtworkNeighbors(artwork.user_id, artwork.id);

    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const isOwner = Boolean(authUser && authUser.id === artwork.user_id);
    const alreadyFollowing =
      !isOwner && authUser ? await isFollowing(authUser.id, artwork.user_id) : false;

    return (
      <ErrorBoundary label="art-details-overlay">
        <ArtworkDetailsModal
          mode="overlay"
          artwork={artwork}
          neighbors={neighbors}
          initialFollowing={alreadyFollowing}
          isAuthenticated={Boolean(authUser)}
          isOwner={isOwner}
        />
      </ErrorBoundary>
    );
  } catch (err) {
    // Server-side errors inside a parallel-slot intercept get swallowed by
    // Next.js and surface as a generic client-side "not iterable" crash on
    // RSC parse. Log the real stack here so Vercel logs show it, then let
    // Next.js render its default error boundary.
    console.error('[art-details-intercept] failed', {
      username: params.username,
      artworkId: params.artworkId,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    throw err;
  }
}
