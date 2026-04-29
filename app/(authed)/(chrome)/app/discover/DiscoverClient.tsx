'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  Image01,
  SearchSm,
  Users01,
  XCircle,
} from '@/components/icons';
import { DiscoverArtworkTile } from '@/components/DiscoverArtworkTile';
import { ArtistCard } from '@/components/ArtistCard';
import { ArtworkDetailsModal } from '@/components/profile/ArtworkDetailsModal';
import { ReferralCTA } from '@/components/ReferralCTA';
import {
  loadMoreArtworks,
  searchArtistsAction,
  searchArtworksAction,
} from '@/app/_actions/discover';
import { useArtworkModal } from '@/lib/use-artwork-modal';
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock';
import { useReverseScrollReveal } from '@/lib/use-reverse-scroll-reveal';
import { REFERRAL_CTA_DISMISSED_KEY, consumeFreshSigninFlag } from '@/lib/referral';
import { SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_QUERY_LENGTH } from '@/lib/search-constants';
import type { DiscoverArtwork } from '@/app/_lib/artworks';
import type { SearchArtistResult } from '@/app/_lib/artists';

const SEARCH_DEBOUNCE_MS = 300;
const TILE_BASIS =
  'basis-[calc((100%-4px)/2)] tab:basis-[calc((100%-8px)/3)] desk:basis-[calc((100%-16px)/5)]';
const ARTISTS_DEFAULT_BY_BP = { mobile: 3, tablet: 4, desktop: 6 } as const;
const MEDIUM_CHIP_LIMIT = 5;

// Search bar + referral CTA share a single fixed panel that scrolls up off
// the top with the grid and snaps back on scroll-up. Search is visible on
// page load; referral fades in after the same dwell pause as Home's Follow CTA.
const REFERRAL_DWELL_MS = 4000;
const PANEL_TRANSITION = 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)';
const REFERRAL_FADE = 'opacity 280ms cubic-bezier(0.2, 0.8, 0.2, 1)';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

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
  initialBookmarkedIds: string[];
  mediumsList: string[];
  initialQuery: string;
  viewerId: string;
  isAuthenticated: boolean;
  /** null when the viewer has no referral_code (shouldn't happen post-signup,
   * but the schema allows it). The CTA panel is suppressed in that case. */
  referralUrl: string | null;
}

export function DiscoverClient({
  initialArtworks,
  initialCursor,
  initialBookmarkedIds,
  mediumsList,
  initialQuery,
  viewerId,
  isAuthenticated,
  referralUrl,
}: DiscoverClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [searchActive, setSearchActive] = useState(
    initialQuery.trim().length >= SEARCH_MIN_QUERY_LENGTH,
  );

  // Default Discover state — full artwork feed.
  const [artworks, setArtworks] = useState(initialArtworks);
  const [artworksCursor, setArtworksCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(
    () => new Set(initialBookmarkedIds),
  );

  // Search results — artists section.
  const [artists, setArtists] = useState<
    (SearchArtistResult & { is_following: boolean })[]
  >([]);
  const [artistsCursor, setArtistsCursor] = useState<string | null>(null);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [artistsLoadingMore, setArtistsLoadingMore] = useState(false);
  // Per-breakpoint default visible count, then bumped by View More clicks.
  // Tracked separately from the loaded list so View More on tablet/desktop can
  // unhide already-loaded cards before fetching the next server page.
  const [artistsViewMoreClicks, setArtistsViewMoreClicks] = useState(0);

  // Search results — artwork section.
  const [searchArtworks, setSearchArtworks] = useState<DiscoverArtwork[]>([]);
  const [searchArtworksCursor, setSearchArtworksCursor] = useState<string | null>(null);
  const [searchArtworksLoading, setSearchArtworksLoading] = useState(false);
  const [searchArtworksLoadingMore, setSearchArtworksLoadingMore] = useState(false);
  const [searchArtworkBookmarks, setSearchArtworkBookmarks] = useState<Set<string>>(
    () => new Set(),
  );

  const [breakpoint, setBreakpoint] = useState<Breakpoint>('mobile');
  const [, startSearch] = useTransition();

  const { modal, openArtwork, closeModal } = useArtworkModal();

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Search-overlay scroll container + bottom-of-artwork sentinel, used together
  // by an IntersectionObserver to drive infinite scroll on the artwork section.
  // The overlay is its own scroll container (not the window), so the observer
  // needs `root: overlayRef.current`.
  const searchOverlayRef = useRef<HTMLDivElement | null>(null);
  const searchArtworksSentinelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Top panel: search bar (visible on load) + referral CTA (mounted after long dwell).
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRowRef = useRef<HTMLDivElement | null>(null);
  const panelHideRef = useRef<number>(76);
  const searchRowHeightRef = useRef<number>(76);
  const [referralMounted, setReferralMounted] = useState(false);
  const [referralReady, setReferralReady] = useState(false);
  const [referralDismissed, setReferralDismissed] = useState(false);
  const referralDismissedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    consumeFreshSigninFlag();
    if (window.localStorage.getItem(REFERRAL_CTA_DISMISSED_KEY) === '1') {
      referralDismissedRef.current = true;
      setReferralDismissed(true);
    }
  }, []);
  const modalOpenRef = useRef(false);
  const searchActiveRef = useRef(false);

  // Breakpoint detection — drives the per-breakpoint default visible count
  // for the artists section. Re-runs on viewport resize so a rotation on
  // tablet does the right thing without forcing a fresh search.
  useEffect(() => {
    const tabletMql = window.matchMedia('(min-width: 768px)');
    const deskMql = window.matchMedia('(min-width: 1280px)');
    const compute = () =>
      setBreakpoint(deskMql.matches ? 'desktop' : tabletMql.matches ? 'tablet' : 'mobile');
    compute();
    tabletMql.addEventListener('change', compute);
    deskMql.addEventListener('change', compute);
    return () => {
      tabletMql.removeEventListener('change', compute);
      deskMql.removeEventListener('change', compute);
    };
  }, []);

  useEffect(() => {
    if (!referralMounted) return;
    const id = requestAnimationFrame(() => setReferralReady(true));
    return () => cancelAnimationFrame(id);
  }, [referralMounted]);

  // Keep panel + search-row heights live so dwell partial-reveals and the
  // hideDistance cap reflect the current panel chrome (referral mounting
  // changes the panel height).
  useEffect(() => {
    const measure = () => {
      if (panelRef.current) panelHideRef.current = panelRef.current.offsetHeight;
      if (searchRowRef.current) searchRowHeightRef.current = searchRowRef.current.offsetHeight;
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(measure);
    if (panelRef.current) obs.observe(panelRef.current);
    if (searchRowRef.current) obs.observe(searchRowRef.current);
    return () => obs.disconnect();
  }, []);

  const scrollHandle = useReverseScrollReveal({
    initialOffset: 0,
    dwellMs: REFERRAL_DWELL_MS,
    hideDistance: () => panelHideRef.current,
    isPaused: () => modalOpenRef.current || searchActiveRef.current,
    isDismissed: () => referralDismissedRef.current || !referralUrl,
    apply: (offset, animated) => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.style.transition = animated ? PANEL_TRANSITION : 'none';
      panel.style.transform = `translateY(-${offset}px)`;
    },
    onReveal: () => {
      if (!referralDismissedRef.current && referralUrl) setReferralMounted(true);
    },
    // Discover's dwell-reveal partially reveals — show just the search bar,
    // not the full panel-with-referral.
    dwellRevealTarget: (currentOffset) =>
      Math.min(currentOffset, searchRowHeightRef.current),
  });

  useEffect(() => {
    modalOpenRef.current = modal !== null;
    if (modal === null && !referralMounted) scrollHandle.current.triggerDwell();
  }, [modal, referralMounted, scrollHandle]);

  useEffect(() => {
    searchActiveRef.current = searchActive;
    if (searchActive) {
      scrollHandle.current.snapToZero();
    } else if (!referralMounted) {
      scrollHandle.current.triggerDwell();
    }
  }, [searchActive, referralMounted, scrollHandle]);

  // Halt page scroll while the search overlay is open so the grid behind
  // doesn't drift when the user touches/wheels.
  useBodyScrollLock(searchActive);

  // URL sync — `?q=foo` on `/app/discover`. Refresh-resilient and back/forward
  // friendly. We replace rather than push so typing doesn't pile up history
  // entries; the initial mount already trusts whatever `q` was on the URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const trimmed = query.trim();
    const next = searchActive && trimmed.length >= SEARCH_MIN_QUERY_LENGTH ? trimmed : null;
    const current = url.searchParams.get('q');
    if (next === current) return;
    if (next) url.searchParams.set('q', next);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, [query, searchActive]);

  // Debounced search — kicks off both artist + artwork queries in parallel.
  useEffect(() => {
    if (!searchActive) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) {
      setArtists([]);
      setArtistsCursor(null);
      setArtistsLoading(false);
      setSearchArtworks([]);
      setSearchArtworksCursor(null);
      setSearchArtworksLoading(false);
      setArtistsViewMoreClicks(0);
      setSearchArtworkBookmarks(new Set());
      return;
    }
    setArtistsLoading(true);
    setSearchArtworksLoading(true);
    searchDebounceRef.current = setTimeout(() => {
      startSearch(async () => {
        const [artistsRes, artworksRes] = await Promise.all([
          searchArtistsAction(query, null),
          searchArtworksAction(query, null),
        ]);
        setArtists(artistsRes.items);
        setArtistsCursor(artistsRes.nextCursor);
        setArtistsLoading(false);
        setArtistsViewMoreClicks(0);
        setSearchArtworks(artworksRes.items);
        setSearchArtworksCursor(artworksRes.nextCursor);
        setSearchArtworksLoading(false);
        setSearchArtworkBookmarks(new Set(artworksRes.bookmarkedIds));
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [query, searchActive]);

  // Medium autocomplete chips — preloaded list, filtered case-insensitively to
  // the top N substring matches. Excludes an exact match so the chip doesn't
  // duplicate what the user already typed.
  const mediumChips = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) return [];
    const needle = trimmed.toLowerCase();
    const out: string[] = [];
    for (const m of mediumsList) {
      const lower = m.toLowerCase();
      if (lower === needle) continue;
      if (!lower.includes(needle)) continue;
      out.push(m);
      if (out.length >= MEDIUM_CHIP_LIMIT) break;
    }
    return out;
  }, [query, mediumsList]);

  async function loadMoreArtists() {
    // First try to unhide already-loaded cards (pre-fetched on the initial page).
    const baseCount = ARTISTS_DEFAULT_BY_BP[breakpoint];
    const currentVisible = baseCount * (artistsViewMoreClicks + 1);
    if (currentVisible < artists.length) {
      setArtistsViewMoreClicks((c) => c + 1);
      return;
    }
    if (artistsLoadingMore || !artistsCursor) return;
    setArtistsLoadingMore(true);
    const r = await searchArtistsAction(query, artistsCursor);
    setArtists((prev) => [...prev, ...r.items]);
    setArtistsCursor(r.nextCursor);
    setArtistsViewMoreClicks((c) => c + 1);
    setArtistsLoadingMore(false);
  }

  const loadMoreSearchArtworks = useCallback(async () => {
    if (searchArtworksLoadingMore || !searchArtworksCursor) return;
    setSearchArtworksLoadingMore(true);
    const r = await searchArtworksAction(query, searchArtworksCursor);
    setSearchArtworks((prev) => [...prev, ...r.items]);
    setSearchArtworksCursor(r.nextCursor);
    if (r.bookmarkedIds.length > 0) {
      setSearchArtworkBookmarks((prev) => {
        const next = new Set(prev);
        for (const id of r.bookmarkedIds) next.add(id);
        return next;
      });
    }
    setSearchArtworksLoadingMore(false);
  }, [query, searchArtworksCursor, searchArtworksLoadingMore]);

  // Default Discover infinite scroll (only when search is inactive).
  const fetchNext = useCallback(async () => {
    if (loadingMore || !artworksCursor) return;
    setLoadingMore(true);
    const r = await loadMoreArtworks(artworksCursor);
    setArtworks((prev) => [...prev, ...r.items]);
    setArtworksCursor(r.nextCursor);
    if (r.bookmarkedIds.length > 0) {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        for (const id of r.bookmarkedIds) next.add(id);
        return next;
      });
    }
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

  // Infinite scroll for the search-results artwork section. The overlay is its
  // own scroll container (overflow-y-auto), so the observer's `root` is the
  // overlay element rather than the window.
  useEffect(() => {
    if (!searchActive) return;
    const sentinel = searchArtworksSentinelRef.current;
    const root = searchOverlayRef.current;
    if (!sentinel || !root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreSearchArtworks();
      },
      { root, rootMargin: '200px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [searchActive, loadMoreSearchArtworks]);

  function clearSearch() {
    setQuery('');
    setSearchActive(false);
    setArtists([]);
    setArtistsCursor(null);
    setArtistsViewMoreClicks(0);
    setSearchArtworks([]);
    setSearchArtworksCursor(null);
    setSearchArtworkBookmarks(new Set());
    inputRef.current?.blur();
  }

  const trimmedQuery = query.trim();
  const queryReady = trimmedQuery.length >= SEARCH_MIN_QUERY_LENGTH;
  const baseVisible = ARTISTS_DEFAULT_BY_BP[breakpoint];
  const visibleArtistsCount = baseVisible * (artistsViewMoreClicks + 1);
  const visibleArtists = artists.slice(0, visibleArtistsCount);
  const hasMoreArtists = artists.length > visibleArtists.length || Boolean(artistsCursor);

  const referralVisible = referralReady && !searchActive;

  return (
    <>
      {/* Fixed top panel: search bar + (after dwell) referral. Translates up
          on scroll-down with the grid, snaps back on scroll-up. */}
      <div
        ref={panelRef}
        className="fixed top-0 left-0 right-0 tab:left-[60px] z-20 pointer-events-none"
        style={{ transform: 'translateY(0)' }}
      >
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
              ref={inputRef}
              type="text"
              value={query}
              maxLength={SEARCH_MAX_QUERY_LENGTH}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!searchActive) setSearchActive(true);
              }}
              onFocus={() => setSearchActive(true)}
              placeholder="Search artists, artwork, or medium…"
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

        {referralMounted && referralUrl && !referralDismissed && (
          <div
            className="mt-[24px] flex justify-center"
            style={{
              opacity: referralVisible ? 1 : 0,
              transition: REFERRAL_FADE,
              pointerEvents: referralVisible ? 'auto' : 'none',
            }}
          >
            <ReferralCTA
              referralUrl={referralUrl}
              onClose={() => {
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(REFERRAL_CTA_DISMISSED_KEY, '1');
                }
                referralDismissedRef.current = true;
                setReferralDismissed(true);
                setReferralMounted(false);
                setReferralReady(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Default-state grid stays mounted while search is active so scroll
          position survives a search → clear cycle. */}
      <div className="pt-[76px] tab:pt-[96px]">
        <ArtworkGridSection
          artworks={artworks}
          sentinelRef={sentinelRef}
          loadingMore={loadingMore}
          hasMore={Boolean(artworksCursor)}
          onOpen={openArtwork}
          viewerId={viewerId}
          isAuthenticated={isAuthenticated}
          bookmarkedIds={bookmarkedIds}
        />
      </div>

      {/* Opaque backdrop sitting between the grid (z=auto) and the search
          overlay (z=15). Keeps the underlying Discover content hidden during
          overscroll/rubber-band even if the overlay momentarily drifts. */}
      {searchActive && (
        <div
          aria-hidden
          className="fixed top-0 left-0 tab:left-[60px] right-0 bottom-0 z-[14] bg-canvas pointer-events-none"
        />
      )}

      {/* Search results overlay — `tab:left-[60px]` keeps everything inside
          this region centered within (viewport - sidebar). `overscroll-contain`
          stops scroll chaining at the overlay's edges. */}
      {searchActive && (
        <div
          ref={searchOverlayRef}
          className="fixed top-[76px] tab:top-[96px] left-0 tab:left-[60px] right-0 bottom-0 z-[15] bg-canvas overflow-y-auto overscroll-contain pb-[80px] tab:pb-[24px]"
        >
          {mediumChips.length > 0 && (
            <div className="sticky top-0 z-10 bg-canvas pt-[8px] pb-[12px]">
              <div className="mx-auto w-full tab:w-[528px] desk:w-[640px] px-[32px] tab:px-0 flex gap-[8px] overflow-x-auto">
                {mediumChips.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setQuery(m);
                      inputRef.current?.focus();
                    }}
                    className="shrink-0 bg-accent/10 rounded-[20px] px-[12px] py-[6px] font-sans font-medium text-[13px] text-accent whitespace-nowrap"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
          <SearchResults
            query={trimmedQuery}
            queryReady={queryReady}
            artists={visibleArtists}
            allArtists={artists}
            artistsLoading={artistsLoading}
            hasMoreArtists={hasMoreArtists}
            artistsLoadingMore={artistsLoadingMore}
            onLoadMoreArtists={loadMoreArtists}
            artworks={searchArtworks}
            artworkBookmarks={searchArtworkBookmarks}
            artworksLoading={searchArtworksLoading}
            hasMoreArtworks={Boolean(searchArtworksCursor)}
            artworksLoadingMore={searchArtworksLoadingMore}
            artworksSentinelRef={searchArtworksSentinelRef}
            onOpenArtwork={openArtwork}
            viewerId={viewerId}
            isAuthenticated={isAuthenticated}
          />
        </div>
      )}

      {modal && (
        <ArtworkDetailsModal
          key={modal.artwork.id}
          mode="overlay"
          artwork={modal.artwork}
          neighbors={feedNeighbors(
            searchActive ? searchArtworks : artworks,
            modal.artwork.id,
          )}
          initialFollowing={modal.initialFollowing}
          initialBookmarked={modal.initialBookmarked}
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
  viewerId,
  isAuthenticated,
  bookmarkedIds,
}: {
  artworks: DiscoverArtwork[];
  sentinelRef: React.RefObject<HTMLDivElement>;
  loadingMore: boolean;
  hasMore: boolean;
  onOpen: (artworkId: string) => void;
  viewerId: string | null;
  isAuthenticated: boolean;
  bookmarkedIds: Set<string>;
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
            <DiscoverArtworkTile
              artwork={art}
              index={i}
              onOpen={onOpen}
              viewerId={viewerId}
              isAuthenticated={isAuthenticated}
              isBookmarked={bookmarkedIds.has(art.id)}
            />
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

interface SearchResultsProps {
  query: string;
  queryReady: boolean;
  artists: (SearchArtistResult & { is_following: boolean })[];
  allArtists: (SearchArtistResult & { is_following: boolean })[];
  artistsLoading: boolean;
  hasMoreArtists: boolean;
  artistsLoadingMore: boolean;
  onLoadMoreArtists: () => void;
  artworks: DiscoverArtwork[];
  artworkBookmarks: Set<string>;
  artworksLoading: boolean;
  hasMoreArtworks: boolean;
  artworksLoadingMore: boolean;
  artworksSentinelRef: React.RefObject<HTMLDivElement>;
  onOpenArtwork: (artworkId: string) => void;
  viewerId: string | null;
  isAuthenticated: boolean;
}

function SearchResults(props: SearchResultsProps) {
  if (!props.queryReady) {
    return (
      <div className="px-[32px] tab:px-[120px] desk:px-[320px] py-[64px] flex flex-col items-center text-center">
        <p className="font-sans text-muted text-[15px]">
          Type a name, medium, or city to find artists and artwork.
        </p>
      </div>
    );
  }
  if (props.artistsLoading && props.artworksLoading && props.allArtists.length === 0 && props.artworks.length === 0) {
    return (
      <div className="px-[32px] tab:px-[120px] desk:px-[320px] py-[64px] flex flex-col items-center text-center">
        <p className="font-sans text-muted text-[15px]">Searching…</p>
      </div>
    );
  }

  const artistsEmpty = !props.artistsLoading && props.allArtists.length === 0;
  const artworksEmpty = !props.artworksLoading && props.artworks.length === 0;

  // Empty Both — drop both section headers, single centered combined message.
  if (artistsEmpty && artworksEmpty) {
    return (
      <div className="px-[32px] tab:px-[120px] desk:px-[320px] pt-[60px] flex flex-col items-center text-center gap-[8px]">
        <p className="font-sans font-semibold text-ink text-[16px]">
          No matches for &ldquo;{props.query}&rdquo;
        </p>
        <p className="font-sans text-muted text-[14px]">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className="px-[32px] tab:px-[92px]">
      <ArtistsSection
        query={props.query}
        artists={props.artists}
        empty={artistsEmpty}
        hasMore={props.hasMoreArtists}
        loadingMore={props.artistsLoadingMore}
        onLoadMore={props.onLoadMoreArtists}
        onOpenArtwork={props.onOpenArtwork}
      />
      <ArtworksSection
        query={props.query}
        artworks={props.artworks}
        bookmarkedIds={props.artworkBookmarks}
        empty={artworksEmpty}
        hasMore={props.hasMoreArtworks}
        loadingMore={props.artworksLoadingMore}
        sentinelRef={props.artworksSentinelRef}
        onOpen={props.onOpenArtwork}
        viewerId={props.viewerId}
        isAuthenticated={props.isAuthenticated}
        // Subsequent section gets the top divider per the Trades bucket-header pattern.
        withTopDivider
      />
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  withTopDivider,
}: {
  icon: typeof Users01;
  title: string;
  withTopDivider?: boolean;
}) {
  return (
    <div className={withTopDivider ? 'pt-[14px] mt-[24px] border-t border-divider/60' : ''}>
      <div className="flex items-center gap-[12px]">
        {/* Untitled UI icons hardcode strokeWidth=2 on the inner <path> and
            silently ignore the prop — the [&_path] arbitrary variant is the
            only way to land 1.67 from Tailwind. See memory note. */}
        <Icon
          className="w-[24px] h-[24px] text-muted shrink-0 [&_path]:[stroke-width:1.67]"
          aria-hidden
        />
        <h2 className="font-sans font-semibold text-ink text-[16px]">{title}</h2>
      </div>
    </div>
  );
}

function ArtistsSection({
  query,
  artists,
  empty,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpenArtwork,
}: {
  query: string;
  artists: (SearchArtistResult & { is_following: boolean })[];
  empty: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpenArtwork: (id: string) => void;
}) {
  return (
    <section className="pt-[16px]">
      <SectionHeader icon={Users01} title="Artists" />
      {empty ? (
        <p className="font-sans text-muted text-[13px] mt-[12px]">
          No artists matched &ldquo;{query}&rdquo;
        </p>
      ) : (
        <>
          <ul className="mt-[12px] grid grid-cols-1 tab:grid-cols-2 desk:grid-cols-3 gap-[16px]">
            {artists.map((a) => (
              <li key={a.id}>
                <ArtistCard artist={a} query={query} onOpenArtwork={onOpenArtwork} />
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="mt-[16px] flex justify-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="font-sans font-medium text-[13px] text-accent disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'View More'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ArtworksSection({
  query,
  artworks,
  bookmarkedIds,
  empty,
  hasMore,
  loadingMore,
  sentinelRef,
  onOpen,
  viewerId,
  isAuthenticated,
  withTopDivider,
}: {
  query: string;
  artworks: DiscoverArtwork[];
  bookmarkedIds: Set<string>;
  empty: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement>;
  onOpen: (artworkId: string) => void;
  viewerId: string | null;
  isAuthenticated: boolean;
  withTopDivider?: boolean;
}) {
  return (
    <section className="pt-[16px]">
      <SectionHeader icon={Image01} title="Artwork" withTopDivider={withTopDivider} />
      {empty ? (
        <p className="font-sans text-muted text-[13px] mt-[12px]">
          No artwork matched &ldquo;{query}&rdquo;
        </p>
      ) : (
        <>
          {/* Full-bleed grid: -mx-[32px] tab:-mx-[92px] cancels the parent's
              padding so tiles span from the sidebar's right edge to the
              viewport edge per the locked design. */}
          <div className="mt-[12px] -mx-[32px] tab:-mx-[92px] flex flex-wrap justify-center gap-[4px]">
            {artworks.map((art, i) => (
              <div key={art.id} className={`${TILE_BASIS} shrink-0`}>
                <DiscoverArtworkTile
                  artwork={art}
                  index={i}
                  onOpen={onOpen}
                  viewerId={viewerId}
                  isAuthenticated={isAuthenticated}
                  isBookmarked={bookmarkedIds.has(art.id)}
                />
              </div>
            ))}
          </div>
          <div ref={sentinelRef} aria-hidden className="h-[1px]" />
          {hasMore && (
            <p className="font-sans text-muted text-[13px] text-center py-[16px]">
              {loadingMore ? 'Loading…' : ''}
            </p>
          )}
        </>
      )}
    </section>
  );
}
