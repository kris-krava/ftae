import Image from 'next/image';
import Link from 'next/link';
import { PlusSquare, Shuffle01 } from '@/components/icons';
import type { ProfileArtwork } from '@/app/_lib/profile';

interface ArtworkGridProps {
  artworks: ProfileArtwork[];
  showAddTile: boolean;
  addHref?: string;
}

export function ArtworkGrid({ artworks, showAddTile, addHref = '/app/add-art' }: ArtworkGridProps) {
  return (
    <div
      className={
        'grid grid-cols-2 tab:grid-cols-3 desk:grid-cols-5 ' +
        'auto-rows-fr ' +
        '-mx-[32px] tab:-mx-[40px] desk:-mx-[80px] ' +
        'w-[calc(100%+64px)] tab:w-[calc(100%+80px)] desk:w-[calc(100%+160px)]'
      }
    >
      {showAddTile && (
        <Link
          href={addHref}
          aria-label="Add artwork"
          className="aspect-square bg-accent/[0.08] border-[1.5px] border-dashed border-accent/40 rounded-[2px] flex items-center justify-center"
        >
          <PlusSquare className="w-[35px] h-[35px] text-accent" />
        </Link>
      )}
      {artworks.map((art) => (
        <ArtworkTile key={art.id} artwork={art} />
      ))}
    </div>
  );
}

function ArtworkTile({ artwork }: { artwork: ProfileArtwork }) {
  return (
    <div className="relative aspect-square bg-divider rounded-[2px] overflow-hidden">
      {artwork.primary_photo_url && (
        <Image
          src={artwork.primary_photo_url}
          alt={artwork.title ?? ''}
          fill
          sizes="(min-width: 1280px) 256px, (min-width: 768px) 256px, 50vw"
          className="object-cover"
        />
      )}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/70 via-transparent"
      />
      {artwork.title && (
        <p className="absolute left-[8px] right-[8px] bottom-[8px] font-sans font-semibold text-[13px] text-surface truncate">
          {artwork.title}
        </p>
      )}
      {artwork.proposal_count > 0 && (
        <span className="absolute top-[12px] right-[12px] bg-black/35 rounded-[12px] pl-[8px] pr-[10px] py-[4px] flex items-center gap-[4px]">
          <Shuffle01 className="w-[14px] h-[14px] text-surface" />
          <span className="font-sans font-semibold text-[12px] text-surface">
            {artwork.proposal_count}
          </span>
        </span>
      )}
    </div>
  );
}
