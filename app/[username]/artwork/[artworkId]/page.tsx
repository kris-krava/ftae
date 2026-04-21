import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getArtworkDetail, getArtworkNeighbors, isFollowing } from '@/app/_lib/profile';
import { ArtworkDetailsModal } from '@/components/profile/ArtworkDetailsModal';

export const dynamic = 'force-dynamic';

interface Props {
  params: { username: string; artworkId: string };
}

export default async function ArtworkDetailsPage({ params }: Props) {
  noStore();
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
    <ArtworkDetailsModal
      mode="standalone"
      artwork={artwork}
      neighbors={neighbors}
      initialFollowing={alreadyFollowing}
      isAuthenticated={Boolean(authUser)}
      isOwner={isOwner}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const artwork = await getArtworkDetail(params.artworkId);
  if (!artwork) return {};
  const title = artwork.title ?? 'Artwork';
  const displayName = artwork.artist.name?.trim() || artwork.artist.username;
  return { title: `${title} · ${displayName} · FTAE` };
}
