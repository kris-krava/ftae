'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { SearchSm, XCircle } from '@/components/icons';
import { DiscoverArtworkTile } from '@/components/DiscoverArtworkTile';
import { ArtistCard } from '@/components/ArtistCard';
import { ArtworkDetailsModal } from '@/components/profile/ArtworkDetailsModal';
import { ReferralCTA } from '@/components/ReferralCTA';
import {
  loadMoreArtworks,
  searchArtistsAction,
} from '@/app/_actions/discover';
import { useArtworkModal } from '@/lib/use-artwork-modal';
import type { DiscoverArtwork } from '@/app/_lib/artworks';
import type { DiscoverArtist } from '@/app/_lib/artists';

const SEARCH_DEBOUNCE_MS = 300;
const TILE_BASIS =
  'basis-[calc((100%-4px)/2)] tab:basis-[calc((100%-8px)/3)] desk:basis-[calc((100%-16px)/5)]';

// Search bar + referral CTA share a single fixed panel that scrolls up off
// the top with the grid and snaps back on scroll-up. Search is visible on
// page load; referral fades in after the same dwell pause as Home's Follow CTA.
const REFERRAL_DWELL_MS = 4000;
const PANEL_TRANSITION = 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)';
const REFERRAL_FADE = 'opacity 280ms cubic-bezier(0.2, 0.8, 0.2, 1)';

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

interface DiscoverClientProps {
  initialArtworks: DiscoverArtwork[];
  initialCursor: string | null;
  isAuthenticated: boolean;
}

export function DiscoverClient({ initialArtworks, initialCursor, isAuthenticated }: DiscoverClientProps) {
  const [query, setQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);

  const [artworks, setArtworks] = useState(initialArtworks);
  const [artworksCursor, setArtworksCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  const [artists, setArtists] = useState<(DiscoverArtist & { is_following: boolean })[]>([]);
  const [artistsCursor, setArtistsCursor] = useState<string | null>(null);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [artistsLoadingMore, setArtistsLoadingMore] = useState(false);
  const [, startSearch] = useTransition();

  const { modal, openArtwork, closeModal } = useArtworkModal();

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Top panel: search bar (visible on load) + referral CTA (mounted after long dwell).
  // Both share a single transform driven by scroll.
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRowRef = useRef<HTMLDivElement | null>(null);
  // Upper bound on translateY — measured from the panel itself so it adapts
  // when the referral mounts (panel grows) and the whole stack can scroll off.
  const panelHideRef = useRef<number>(76);
  // Search-row height — used as the dwell-reveal target so dwell only
  // exposes the referral (at viewport-top + 24) without dragging the search
  // bar back into view if it had been scrolled away.
  const searchRowHeightRef = useRef<number>(76);
  const [referralMounted, setReferralMounted] = useState(false);
  // Drives the opacity fade-in once the card is mounted; flipped on next frame.
  const [referralReady, setReferralReady] = useState(false);
  // Both the modal and the search-active state pause the dwell timer. When
  // either flips back to inactive AND the referral is still un-mounted, the
  // dwell restarts from zero.
  const modalOpenRef = useRef(false);
  const searchActiveRef = useRef(false);
  const startDwellRef = useRef<() => void>(() => {});
  const snapPanelRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!referralMounted) return;
    const id = requestAnimationFrame(() => setReferralReady(true));
    return () => cancelAnimationFrame(id);
  }, [referralMounted]);

  useEffect(() => {
    let dwellTimer: number | null = null;
    let lastY = window.scrollY;
    let offset = 0; // panel starts visible — search bar is on page load

    // Measure both the whole panel (scroll-down clamp) and the search row
    // (dwell-reveal target). ResizeObserver picks up referral-mount growth
    // and breakpoint flips automatically.
    const measure = () => {
      if (panelRef.current) panelHideRef.current = panelRef.current.offsetHeight;
      if (searchRowRef.current) searchRowHeightRef.current = searchRowRef.current.offsetHeight;
    };
    measure();
    let resizeObs: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(measure);
      if (panelRef.current) resizeObs.observe(panelRef.current);
      if (searchRowRef.current) resizeObs.observe(searchRowRef.current);
    }

    const apply = (animated: boolean) => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.style.transition = animated ? PANEL_TRANSITION : 'none';
      panel.style.transform = `translateY(-${offset}px)`;
    };

    // Two reveal modes. dwellReveal mounts the card and exposes only the
    // referral (clamps offset down to search-row height) — search stays off
    // if it was scrolled away. fullReveal restores both (offset = 0) and is
    // used by the scroll-up snap-back.
    const dwellReveal = () => {
      setReferralMounted(true);
      const target = Math.min(offset, searchRowHeightRef.current);
      if (offset === target) return;
      offset = target;
      apply(true);
    };

    // snapPanelToTop just resets the offset without touching the referral
    // state — used by the search-focus trigger so a partially-scrolled panel
    // snaps fully into view without coincidentally mounting the referral.
    const snapPanelToTop = () => {
      if (offset === 0) return;
      offset = 0;
      apply(true);
    };
    snapPanelRef.current = snapPanelToTop;

    const fullReveal = () => {
      setReferralMounted(true);
      snapPanelToTop();
    };

    const startDwell = () => {
      if (dwellTimer) window.clearTimeout(dwellTimer);
      if (modalOpenRef.current || searchActiveRef.current) return;
      dwellTimer = window.setTimeout(() => {
        if (modalOpenRef.current || searchActiveRef.current) return;
        dwellReveal();
      }, REFERRAL_DWELL_MS);
    };
    startDwellRef.current = startDwell;

    const onScroll = () => {
      const cur = window.scrollY;
      const dy = cur - lastY;
      lastY = cur;
      startDwell();
      if (dy > 0) {
        offset = Math.min(offset + dy, panelHideRef.current);
        apply(false);
      } else if (dy < 0) {
        fullReveal();
      }
    };

    startDwell();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (dwellTimer) window.clearTimeout(dwellTimer);
      if (resizeObs) resizeObs.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    modalOpenRef.current = modal !== null;
    if (modal === null && !referralMounted) startDwellRef.current();
  }, [modal, referralMounted]);

  useEffect(() => {
    searchActiveRef.current = searchActive;
    if (searchActive) {
      // Snap a partially-scrolled panel back to its full position so the
      // search bar can never appear mid-translate while the user is typing.
      snapPanelRef.current();
    } else if (!referralMounted) {
      startDwellRef.current();
    }
  }, [searchActive, referralMounted]);

  // Halt page scroll while the search overlay is open so the grid behind
  // doesn't drift when the user touches/wheels. Setting overflow on the
  // documentElement (html) blocks all user-initiated scroll; setting it on
  // body alone doesn't block scrolling on the root in modern browsers.
  useEffect(() => {
    if (!searchActive) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = prev;
    };
  }, [searchActive]);

  // Debounced search
  useEffect(() => {
    if (!searchActive) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (query.trim().length === 0) {
      setArtists([]);
      setArtistsCursor(null);
      return;
    }
    setArtistsLoading(true);
    searchDebounceRef.current = setTimeout(() => {
      startSearch(async () => {
        const r = await searchArtistsAction(query, null);
        setArtists(r.items);
        setArtistsCursor(r.nextCursor);
        setArtistsLoading(false);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [query, searchActive]);

  async function loadMoreArtists() {
    if (artistsLoadingMore || !artistsCursor) return;
    setArtistsLoadingMore(true);
    const r = await searchArtistsAction(query, artistsCursor);
    setArtists((prev) => [...prev, ...r.items]);
    setArtistsCursor(r.nextCursor);
    setArtistsLoadingMore(false);
  }

  // Infinite scroll for artworks (default state only)
  const fetchNext = useCallback(async () => {
    if (loadingMore || !artworksCursor) return;
    setLoadingMore(true);
    const r = await loadMoreArtworks(artworksCursor);
    setArtworks((prev) => [...prev, ...r.items]);
    setArtworksCursor(r.nextCursor);
    setLoadingMore(false);
  }, [artworksCursor, loadingMore]);

  useEffect(() => {
    if (searchActive) return;
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
  }, [searchActive, fetchNext]);

  function clearSearch() {
    setQuery('');
    setSearchActive(false);
    setArtists([]);
  }

  const referralVisible = referralReady && !searchActive;

  return (
    <>
      {/* Fixed top panel: search bar + (after dwell) referral. Translates up
          on scroll-down with the grid, snaps back on scroll-up. bg-canvas so
          the row reads as a solid unit sliding up; pointer-events:none on the
          referral wrapper region so transparent gaps don't block grid taps. */}
      <div
        ref={panelRef}
        className="fixed top-0 left-0 right-0 tab:left-[60px] z-20 pointer-events-none"
        style={{ transform: 'translateY(0)' }}
      >
        {/* Only the search row gets the canvas bg, so it reads as a solid
            colored bar sliding off on scroll. Below the row the wrapper is
            transparent and the grid shows through behind the referral. The
            inner bar uses mx-auto + fixed widths so both bar and referral
            center on the GRID's center (panel spans the grid area only on
            tab/desk thanks to left-[60px] above). */}
        <div
          ref={searchRowRef}
          className="bg-canvas pt-[16px] tab:pt-[26px] pb-[16px] tab:pb-[26px] px-[32px] tab:px-0"
        >
          <div
            className={
              'mx-auto w-full tab:w-[528px] desk:w-[640px] bg-surface rounded-[10px] h-[44px] flex items-center gap-[8px] px-[14px] pointer-events-auto ' +
              (searchActive ? 'border-[1.5px] border-accent/50' : 'border border-divider/60')
            }
          >
            <SearchSm
              className={`w-[20px] h-[20px] shrink-0 ${searchActive ? 'text-ink' : 'text-muted'}`}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!searchActive) setSearchActive(true);
              }}
              onFocus={() => setSearchActive(true)}
              placeholder="Search artists or medium…"
              className="flex-1 min-w-0 bg-transparent border-0 p-0 font-sans text-[15px] text-ink placeholder:text-placeholder focus:outline-none focus:ring-0"
            />
            {searchActive && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="shrink-0"
              >
                <XCircle className="w-[20px] h-[20px] text-muted" />
              </button>
            )}
          </div>
        </div>

        {referralMounted && (
          <div
            className="mt-[24px] flex justify-center"
            style={{
              opacity: referralVisible ? 1 : 0,
              transition: REFERRAL_FADE,
              pointerEvents: referralVisible ? 'auto' : 'none',
            }}
          >
            <ReferralCTA />
          </div>
        )}
      </div>

      {/* Grid stays mounted whether or not search is active so the page's
          scroll position is preserved when the user opens / closes search.
          Top padding equals the fixed search row's height (76 mobile / 96
          tab+desk) so the grid starts below the search bar. The bar then
          translates up on scroll-down via the panel-translate logic above. */}
      <div className="pt-[76px] tab:pt-[96px]">
        <ArtworkGridSection
          artworks={artworks}
          sentinelRef={sentinelRef}
          loadingMore={loadingMore}
          hasMore={Boolean(artworksCursor)}
          onOpen={openArtwork}
        />
      </div>

      {/* Search results render as a fixed overlay on top of the grid so the
          underlying scroll position survives toggling search on and off.
          tab:left-[60px] keeps the overlay aligned with the grid area, not
          the full viewport. */}
      {searchActive && (
        <div className="fixed top-[76px] tab:top-[96px] left-0 tab:left-[60px] right-0 bottom-0 z-[15] bg-canvas overflow-y-auto pb-[80px] tab:pb-[24px]">
          <SearchResults
            query={query}
            artists={artists}
            loading={artistsLoading}
            isAuthenticated={isAuthenticated}
            hasMore={Boolean(artistsCursor)}
            loadingMore={artistsLoadingMore}
            onLoadMore={loadMoreArtists}
          />
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

function ArtworkGridSection({
  artworks,
  sentinelRef,
  loadingMore,
  hasMore,
  onOpen,
}: {
  artworks: DiscoverArtwork[];
  sentinelRef: React.RefObject<HTMLDivElement>;
  loadingMore: boolean;
  hasMore: boolean;
  onOpen: (artworkId: string) => void;
}) {
  if (artworks.length === 0) {
    return (
      <div className="px-[32px] tab:px-[120px] desk:px-[320px] py-[64px] flex flex-col items-center text-center">
        <p className="font-sans text-muted text-[15px]">
          No artwork yet. Be among the first to add some.
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="flex flex-wrap justify-center gap-[4px]">
        {artworks.map((art, i) => (
          <div key={art.id} className={`${TILE_BASIS} shrink-0`}>
            <DiscoverArtworkTile artwork={art} index={i} onOpen={onOpen} />
          </div>
        ))}
      </div>
      <div ref={sentinelRef} aria-hidden className="h-[1px]" />
      {hasMore && (
        <p className="font-sans text-muted text-[13px] text-center py-[24px]">
          {loadingMore ? 'Loading…' : ''}
        </p>
      )}
    </>
  );
}

function SearchResults({
  query,
  artists,
  loading,
  isAuthenticated,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  query: string;
  artists: (DiscoverArtist & { is_following: boolean })[];
  loading: boolean;
  isAuthenticated: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  if (query.trim().length === 0) {
    return (
      <div className="px-[32px] tab:px-[120px] desk:px-[320px] py-[64px] flex flex-col items-center text-center">
        <p className="font-sans text-muted text-[15px]">
          Type a name or medium to find artists.
        </p>
      </div>
    );
  }
  if (loading && artists.length === 0) {
    return (
      <div className="px-[32px] tab:px-[120px] desk:px-[320px] py-[64px] flex flex-col items-center text-center">
        <p className="font-sans text-muted text-[15px]">Searching…</p>
      </div>
    );
  }
  if (artists.length === 0) {
    return (
      <div className="px-[32px] tab:px-[120px] desk:px-[320px] py-[64px] flex flex-col items-center text-center">
        <p className="font-sans text-muted text-[15px]">
          No artists matched &ldquo;{query.trim()}&rdquo;.
        </p>
      </div>
    );
  }
  return (
    <div className="px-[32px] tab:px-[120px] desk:px-[320px]">
      <ul className="flex flex-col gap-[16px]">
        {artists.map((a) => (
          <li key={a.id}>
            <ArtistCard
              artist={a}
              initialFollowing={a.is_following}
              isAuthenticated={isAuthenticated}
            />
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="mt-[16px] mx-auto block font-sans text-[13px] text-accent underline disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
