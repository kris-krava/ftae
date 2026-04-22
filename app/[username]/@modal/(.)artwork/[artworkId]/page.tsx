import { ArtworkDetailsIntercept } from '@/components/profile/ArtworkDetailsIntercept';

export const dynamic = 'force-dynamic';

interface Props {
  params: { username: string; artworkId: string };
}

// Intercept for in-profile clicks: /[username] → /[username]/artwork/[id].
export default async function ProfileArtworkIntercept({ params }: Props) {
  return <ArtworkDetailsIntercept username={params.username} artworkId={params.artworkId} />;
}
