import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getArtworkDetail, getArtworkNeighbors, isFollowing } from '@/app/_lib/profile';
import { ArtworkDetailsModal } from '@/components/profile/ArtworkDetailsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Shared server component for the Art Details overlay. The per-subtree
// intercepting page files (under app/[username]/@modal/ for profile clicks,
// app/app/@modal/ for /app/* clicks) call this with their resolved params.
// Root-level @modal slots have been flaky on Vercel with this nested-dynamic
// pattern, so we keep each intercept scoped to the subtree it serves.
export async function ArtworkDetailsIntercept({
  username,
  artworkId,
}: {
  username: string;
  artworkId: string;
}) {
  noStore();
  try {
    const artwork = await getArtworkDetail(artworkId);
    if (!artwork) notFound();
    if (artwork.artist.username !== username.toLowerCase()) notFound();

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
    console.error('[art-details-intercept] failed', {
      username,
      artworkId,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    throw err;
  }
}
