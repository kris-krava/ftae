'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PlusSquare, Shuffle01 } from '@/components/icons';
import { ArtworkDetailsModal } from '@/components/profile/ArtworkDetailsModal';
import { fetchArtworkModal, type ArtworkModalPayload } from '@/app/_actions/discover';
import type { ProfileArtwork } from '@/app/_lib/profile';

function feedNeighbors(
  feed: { id: string }[],
  currentId: string,
): { prev: string | null; next: string | null } {
  const idx = feed.findIndex((a) => a.id === currentId);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? feed[idx - 1].id : null,
    next: idx < feed.length - 1 ? feed[idx + 1].id : null,
  };
}

interface ArtworkGridProps {
  artworks: ProfileArtwork[];
  showAddTile: boolean;
  addHref?: string;
}

const TILE_BASIS =
  'basis-[calc((100%-4px)/2)] tab:basis-[calc((100%-8px)/3)] desk:basis-[calc((100%-16px)/5)]';

export function ArtworkGrid({
  artworks,
  showAddTile,
  addHref = '/app/add-art',
}: ArtworkGridProps) {
  const [modal, setModal] = useState<ArtworkModalPayload | null>(null);

  const openArtwork = useCallback(async (artworkId: string) => {
    const payload = await fetchArtworkModal(artworkId);
    if (payload) setModal(payload);
  }, []);
  const closeModal = useCallback(() => setModal(null), []);

  return (
    <>
      <div className="flex flex-wrap justify-center gap-[4px] w-full">
        {showAddTile && (
          <Link
            href={addHref}
            aria-label="Add Art"
            className={`${TILE_BASIS} shrink-0 aspect-square bg-accent/[0.08] border-[1.5px] border-dashed border-accent/40 rounded-[2px] flex items-center justify-center`}
          >
            <PlusSquare className="w-[35px] h-[35px] text-accent" />
          </Link>
        )}
        {artworks.map((art) => (
          <ArtworkTile key={art.id} artwork={art} onOpen={openArtwork} />
        ))}
      </div>

      {modal && (
        <ArtworkDetailsModal
          key={modal.artwork.id}
          mode="overlay"
          artwork={modal.artwork}
          neighbors={feedNeighbors(artworks, modal.artwork.id)}
          initialFollowing={modal.initialFollowing}
          isAuthenticated={modal.isAuthenticated}
          isOwner={modal.isOwner}
          onClose={closeModal}
          onNavigate={openArtwork}
        />
      )}
    </>
  );
}

function ArtworkTile({
  artwork,
  onOpen,
}: {
  artwork: ProfileArtwork;
  onOpen: (artworkId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(artwork.id)}
      aria-label={artwork.title ?? 'View artwork'}
      className={`${TILE_BASIS} shrink-0 relative aspect-square bg-divider rounded-[2px] overflow-hidden`}
    >
      {artwork.primary_photo_url && (
        <Image
          src={artwork.primary_photo_url}
          alt={artwork.title ?? ''}
          fill
          sizes="(min-width: 1280px) 256px, (min-width: 768px) 256px, 50vw"
          className="object-contain"
        />
      )}
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-[55%] to-black/70"
      />
      {artwork.title && (
        <p className="absolute left-[8px] right-[8px] bottom-[8px] font-sans font-semibold text-[13px] text-surface truncate text-left">
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
    </button>
  );
}
