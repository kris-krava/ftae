'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { SearchSm, XCircle } from '@/components/icons';
import { DiscoverArtworkTile } from '@/components/DiscoverArtworkTile';
import { ArtistCard } from '@/components/ArtistCard';
import { ArtworkDetailsModal } from '@/components/profile/ArtworkDetailsModal';
import {
  fetchArtworkModal,
  loadMoreArtworks,
  searchArtistsAction,
  type ArtworkModalPayload,
} from '@/app/_actions/discover';
import type { DiscoverArtwork } from '@/app/_lib/artworks';
import type { DiscoverArtist } from '@/app/_lib/artists';

const SEARCH_DEBOUNCE_MS = 300;
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

  const [modal, setModal] = useState<ArtworkModalPayload | null>(null);

  const openArtwork = useCallback(async (artworkId: string) => {
    const payload = await fetchArtworkModal(artworkId);
    if (payload) setModal(payload);
  }, []);
  const closeModal = useCallback(() => setModal(null), []);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <>
      <div className="pt-[16px] pb-[16px] tab:pt-[26px] tab:pb-[26px] px-[32px] tab:px-[120px] desk:px-[320px]">
        <div
          className={
            'bg-surface rounded-[10px] h-[44px] flex items-center gap-[8px] px-[14px] ' +
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

      {searchActive ? (
        <SearchResults
          query={query}
          artists={artists}
          loading={artistsLoading}
          isAuthenticated={isAuthenticated}
          hasMore={Boolean(artistsCursor)}
          loadingMore={artistsLoadingMore}
          onLoadMore={loadMoreArtists}
        />
      ) : (
        <ArtworkGridSection
          artworks={artworks}
          sentinelRef={sentinelRef}
          loadingMore={loadingMore}
          hasMore={Boolean(artworksCursor)}
          onOpen={openArtwork}
        />
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
