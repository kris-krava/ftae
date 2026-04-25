import Image from 'next/image';
import type { DiscoverArtwork } from '@/app/_lib/artworks';

interface DiscoverArtworkTileProps {
  artwork: DiscoverArtwork;
  index: number;
  onOpen: (artworkId: string) => void;
}

const FALLBACK_COLORS = [
  '#d1a680', '#85abc4', '#a6c999', '#d6998a', '#c4b57a', '#9191c7',
  '#8c7a73', '#b29e94', '#73858c', '#9e947a', '#8b6a5c', '#b8a6ad',
  '#999c7c', '#c78b6e', '#8a9eb5', '#a68b73',
];

export function DiscoverArtworkTile({ artwork, index, onOpen }: DiscoverArtworkTileProps) {
  const bg = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  return (
    <button
      type="button"
      onClick={() => onOpen(artwork.id)}
      aria-label={artwork.title ?? 'View artwork'}
      className="relative aspect-square overflow-hidden rounded-[2px] block w-full"
      style={{ backgroundColor: bg }}
    >
      {artwork.primary_photo_url && (
        <Image
          src={artwork.primary_photo_url}
          alt={artwork.title ?? ''}
          fill
          sizes="(min-width: 1280px) 256px, (min-width: 768px) 256px, 50vw"
          className="object-cover"
          style={{
            objectPosition: `${artwork.primary_photo_focal_x * 100}% ${artwork.primary_photo_focal_y * 100}%`,
          }}
          priority={index < 4}
        />
      )}
    </button>
  );
}
