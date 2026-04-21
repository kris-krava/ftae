import Image from 'next/image';
import Link from 'next/link';
import { Heart } from '@/components/icons';
import type { DiscoverArtwork } from '@/app/_lib/artworks';

interface DiscoverArtworkTileProps {
  artwork: DiscoverArtwork;
  index: number;
}

const FALLBACK_COLORS = [
  '#d1a680', '#85abc4', '#a6c999', '#d6998a', '#c4b57a', '#9191c7',
  '#8c7a73', '#b29e94', '#73858c', '#9e947a', '#8b6a5c', '#b8a6ad',
  '#999c7c', '#c78b6e', '#8a9eb5', '#a68b73',
];

export function DiscoverArtworkTile({ artwork, index }: DiscoverArtworkTileProps) {
  const bg = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  const artistName = artwork.artist_name?.trim() || artwork.artist_username;
  return (
    <Link
      href={`/${artwork.artist_username}`}
      aria-label={`${artistName}'s profile`}
      className="relative aspect-square overflow-hidden rounded-[2px] block"
      style={{ backgroundColor: bg }}
    >
      {artwork.primary_photo_url && (
        <Image
          src={artwork.primary_photo_url}
          alt={artwork.title ?? ''}
          fill
          sizes="(min-width: 1280px) 256px, (min-width: 768px) 256px, 50vw"
          className="object-cover"
          priority={index < 4}
        />
      )}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/70 via-transparent"
      />
      <Heart
        aria-hidden
        className="absolute top-[12px] right-[12px] w-[24px] h-[24px] text-surface"
      />
      {(artwork.artist_name?.trim() || artwork.artist_username) && (
        <p className="absolute left-[8px] right-[8px] bottom-[8px] font-sans font-semibold text-[13px] text-surface truncate">
          {artwork.artist_name?.trim() || artwork.artist_username}
        </p>
      )}
    </Link>
  );
}
