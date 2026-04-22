'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DiscoverArtworkTile } from '@/components/DiscoverArtworkTile';
import { ArtworkDetailsModal } from '@/components/profile/ArtworkDetailsModal';
import { fetchArtworkModal, type ArtworkModalPayload } from '@/app/_actions/discover';
import { loadMoreHomeFeed } from '@/app/_actions/home';
import type { DiscoverArtwork } from '@/app/_lib/artworks';

const TILE_BASIS =
  'basis-[calc((100%-4px)/2)] tab:basis-[calc((100%-8px)/3)] desk:basis-[calc((100%-16px)/5)]';

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

interface HomeFeedClientProps {
  initialArtworks: DiscoverArtwork[];
  initialCursor: string | null;
}

export function HomeFeedClient({ initialArtworks, initialCursor }: HomeFeedClientProps) {
  const [artworks, setArtworks] = useState(initialArtworks);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [modal, setModal] = useState<ArtworkModalPayload | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const openArtwork = useCallback(async (artworkId: string) => {
    const payload = await fetchArtworkModal(artworkId);
    if (payload) setModal(payload);
  }, []);
  const closeModal = useCallback(() => setModal(null), []);

  const fetchNext = useCallback(async () => {
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    const r = await loadMoreHomeFeed(cursor);
    setArtworks((prev) => [...prev, ...r.items]);
    setCursor(r.nextCursor);
    setLoadingMore(false);
  }, [cursor, loadingMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNext();
      },
      { rootMargin: '200px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [fetchNext]);

  return (
    <>
      <div className="flex flex-wrap justify-center gap-[4px] pt-[16px] tab:pt-[26px]">
        {artworks.map((art, i) => (
          <div key={art.id} className={`${TILE_BASIS} shrink-0`}>
            <DiscoverArtworkTile artwork={art} index={i} onOpen={openArtwork} />
          </div>
        ))}
      </div>
      <div ref={sentinelRef} aria-hidden className="h-[1px]" />
      {cursor && (
        <p className="font-sans text-muted text-[13px] text-center py-[24px]">
          {loadingMore ? 'Loading…' : ''}
        </p>
      )}

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
