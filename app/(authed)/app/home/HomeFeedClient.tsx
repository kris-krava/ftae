'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DiscoverArtworkTile } from '@/components/DiscoverArtworkTile';
import { FollowCTA } from '@/components/FollowCTA';
import { ArtworkDetailsModal } from '@/components/profile/ArtworkDetailsModal';
import { fetchArtworkModal, type ArtworkModalPayload } from '@/app/_actions/discover';
import { loadMoreHomeFeed } from '@/app/_actions/home';
import type { DiscoverArtwork } from '@/app/_lib/artworks';

const TILE_BASIS =
  'basis-[calc((100%-4px)/2)] tab:basis-[calc((100%-8px)/3)] desk:basis-[calc((100%-16px)/5)]';

// Reveal the Follow CTA after the user has paused (no scroll) for this long.
const FOLLOW_CTA_DWELL_MS = 4000;
// Distance to push the card up to clear the viewport. Card is ~96px + 24px top.
const FOLLOW_CTA_HIDE = 200;
// Slide-down transition used on every reveal (initial dwell + scroll-up snap-back).
const FOLLOW_CTA_TRANSITION = 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)';

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
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  // Pause the dwell timer while the art-details modal is open so the card
  // doesn't slide in behind it. Modal effect (below) flips the ref and kicks
  // the dwell back on close.
  const modalOpenRef = useRef(false);
  const startDwellRef = useRef<() => void>(() => {});

  // After the card mounts (off-screen), wait one painted frame so the browser
  // commits the off-screen transform, THEN kick it to 0 — the CSS transition
  // sees the change and slides the card down into position. A single rAF
  // isn't enough: React's render and the rAF can land in the same frame, so
  // the browser only ever paints the final position. The double rAF guarantees
  // a paint at the off-screen position first.
  useEffect(() => {
    if (!mounted) return;
    const card = cardRef.current;
    if (!card) return;
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        card.style.transform = 'translate(-50%, 0)';
      });
      (card as HTMLDivElement & { __raf?: number }).__raf = id2;
    });
    return () => {
      cancelAnimationFrame(id1);
      const id2 = (card as HTMLDivElement & { __raf?: number }).__raf;
      if (id2) cancelAnimationFrame(id2);
    };
  }, [mounted]);

  useEffect(() => {
    let dwellTimer: number | null = null;
    let lastY = window.scrollY;
    let offset = FOLLOW_CTA_HIDE;

    const apply = (animated: boolean) => {
      const card = cardRef.current;
      if (!card) return;
      // Animated reveals get a CSS transition; scroll-down tracking is instant
      // so the card stays glued to the grid frame-for-frame.
      card.style.transition = animated ? FOLLOW_CTA_TRANSITION : 'none';
      card.style.transform = `translate(-50%, -${offset}px)`;
    };

    const reveal = () => {
      if (offset === 0) return;
      offset = 0;
      setMounted(true);
      apply(true);
    };

    const startDwell = () => {
      if (dwellTimer) window.clearTimeout(dwellTimer);
      if (modalOpenRef.current) return;
      dwellTimer = window.setTimeout(() => {
        if (modalOpenRef.current) return;
        reveal();
      }, FOLLOW_CTA_DWELL_MS);
    };
    startDwellRef.current = startDwell;

    const onScroll = () => {
      const cur = window.scrollY;
      const dy = cur - lastY;
      lastY = cur;
      startDwell();
      if (dy > 0) {
        offset = Math.min(offset + dy, FOLLOW_CTA_HIDE);
        apply(false);
      } else if (dy < 0) {
        reveal();
      }
    };

    startDwell();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (dwellTimer) window.clearTimeout(dwellTimer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    modalOpenRef.current = modal !== null;
    if (modal === null) startDwellRef.current();
  }, [modal]);

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

      {mounted && (
        <div
          ref={cardRef}
          className="fixed top-[24px] left-1/2 z-10"
          style={{
            // Start off-screen so the slide-in animation has somewhere to come from.
            // The effect below kicks the transform to 0 on the next frame, letting
            // the CSS transition do the slide.
            transform: `translate(-50%, -${FOLLOW_CTA_HIDE}px)`,
            transition: FOLLOW_CTA_TRANSITION,
          }}
        >
          <FollowCTA />
        </div>
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
