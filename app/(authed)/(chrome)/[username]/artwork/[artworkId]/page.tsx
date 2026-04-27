import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getArtworkDetail, getArtworkNeighbors, isFollowing } from '@/app/_lib/profile';
import { isBookmarked } from '@/app/_lib/bookmarks';
import { ArtworkDetailsModal } from '@/components/profile/ArtworkDetailsModal';

interface Props {
  params: Promise<{ username: string; artworkId: string }>;
}

export default async function ArtworkDetailsPage(props: Props) {
  const params = await props.params;
  noStore();
  const artwork = await getArtworkDetail(params.artworkId);
  if (!artwork) notFound();
  if (artwork.artist.username !== params.username.toLowerCase()) notFound();

  const neighbors = await getArtworkNeighbors(artwork.user_id, artwork.id);

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const isOwner = Boolean(authUser && authUser.id === artwork.user_id);
  const [alreadyFollowing, alreadyBookmarked] = await Promise.all([
    !isOwner && authUser ? isFollowing(authUser.id, artwork.user_id) : Promise.resolve(false),
    !isOwner && authUser ? isBookmarked(authUser.id, artwork.id) : Promise.resolve(false),
  ]);

  return (
    <ArtworkDetailsModal
      mode="standalone"
      artwork={artwork}
      neighbors={neighbors}
      initialFollowing={alreadyFollowing}
      initialBookmarked={alreadyBookmarked}
      isAuthenticated={Boolean(authUser)}
      isOwner={isOwner}
    />
  );
}

export async function generateMetadata(props: Props) {
  const params = await props.params;
  const artwork = await getArtworkDetail(params.artworkId);
  if (!artwork) return {};
  const title = artwork.title ?? 'Artwork';
  const displayName = artwork.artist.name?.trim() || artwork.artist.username;
  return { title: `${title} · ${displayName} · FTAE` };
}
