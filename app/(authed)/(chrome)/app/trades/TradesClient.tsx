'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { Bookmark, Edit02, Zap, CheckCircle } from '@/components/icons';
import { ArtworkDetailsModal } from '@/components/profile/ArtworkDetailsModal';
import { useArtworkModal } from '@/lib/use-artwork-modal';
import type { BookmarkedArtistGroup as BookmarkedArtistGroupData } from '@/app/_lib/bookmarks';
import { BookmarkedArtistGroup } from './_components/BookmarkedArtistGroup';
import { BookmarkedEmpty } from './_components/BookmarkedEmpty';
import { BucketHeader } from './_components/BucketHeader';
import { PlaceholderEmpty } from './_components/PlaceholderEmpty';
import { TradesTabStrip } from './_components/TradesTabStrip';
import type { TradesTab } from './_components/tabs';

function dropArtwork(prev: BookmarkedArtistGroupData[], artworkId: string) {
  let touched = false;
  const next: BookmarkedArtistGroupData[] = [];
  for (const group of prev) {
    const filtered = group.pieces.filter((p) => p.id !== artworkId);
    if (filtered.length === group.pieces.length) {
      next.push(group);
      continue;
    }
    touched = true;
    if (filtered.length > 0) next.push({ ...group, pieces: filtered });
  }
  return touched ? next : prev;
}

interface TradesClientProps {
  initialGroups: BookmarkedArtistGroupData[];
}

const PLACEHOLDER_COPY = 'Trading begins July 1, 2026';
const PANEL_TRANSITION = 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)';

export function TradesClient({ initialGroups }: TradesClientProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [activeTab, setActiveTab] = useState<TradesTab>('bookmarked');
  const { modal, openArtwork, closeModal } = useArtworkModal();

  // While the modal is open, bookmark toggles are PROVISIONAL — pieces stay in
  // `groups` so prev/next navigation keeps working and the user can re-bookmark
  // a piece they just unsaved without it disappearing. Pending unbookmarks are
  // applied to `groups` only when the modal goes from open → closed.
  const pendingUnbookmarksRef = useRef<Set<string>>(new Set());
  const modalOpenRef = useRef(false);
  useEffect(() => {
    modalOpenRef.current = !!modal;
  }, [modal]);

  useEffect(() => {
    function onToggled(e: WindowEventMap['bookmark:toggled']) {
      const { artworkId, bookmarked } = e.detail;
      if (modalOpenRef.current) {
        // Modal session in progress — queue the change instead of applying it.
        if (bookmarked) pendingUnbookmarksRef.current.delete(artworkId);
        else pendingUnbookmarksRef.current.add(artworkId);
        return;
      }
      // No modal — this came from a tile overlay click. Drop the piece now.
      if (!bookmarked) setGroups((prev) => dropArtwork(prev, artworkId));
    }
    window.addEventListener('bookmark:toggled', onToggled);
    return () => window.removeEventListener('bookmark:toggled', onToggled);
  }, []);

  // On modal close (open → null), apply any queued unbookmarks.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    const isOpen = !!modal;
    if (wasOpenRef.current && !isOpen) {
      const pending = pendingUnbookmarksRef.current;
      if (pending.size > 0) {
        const ids = Array.from(pending);
        setGroups((prev) => ids.reduce((acc, id) => dropArtwork(acc, id), prev));
        pending.clear();
      }
    }
    wasOpenRef.current = isOpen;
  }, [modal]);

  // Mobile-only: tab strip hides on scroll-down and reveals on scroll-up.
  // Always animated — no scroll-tracking, so iOS rubber-band and small
  // jitter dy values can't shove the strip off-screen. No-op above the
  // `tab` breakpoint (768px).
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelHideRef = useRef<number>(80);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 768px)');
    if (mql.matches) return;

    const SHOW_AT_TOP = 8;
    const DY_THRESHOLD = 4;

    let lastY = window.scrollY;
    let hidden = false;

    const measure = () => {
      if (panelRef.current) panelHideRef.current = panelRef.current.offsetHeight;
    };
    measure();

    const apply = () => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.style.transition = PANEL_TRANSITION;
      panel.style.transform = hidden
        ? `translateY(-${panelHideRef.current}px)`
        : 'translateY(0)';
    };

    const onScroll = () => {
      const cur = window.scrollY;
      const dy = cur - lastY;
      lastY = cur;
      if (cur <= SHOW_AT_TOP) {
        if (hidden) {
          hidden = false;
          apply();
        }
        return;
      }
      if (dy > DY_THRESHOLD && !hidden) {
        hidden = true;
        apply();
      } else if (dy < -DY_THRESHOLD && hidden) {
        hidden = false;
        apply();
      }
    };

    let resizeObs: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && panelRef.current) {
      resizeObs = new ResizeObserver(measure);
      resizeObs.observe(panelRef.current);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (resizeObs) resizeObs.disconnect();
    };
  }, []);

  const allArtworkIds = groups.flatMap((g) => g.pieces.map((p) => p.id));
  const neighborsFor = (currentId: string) => {
    const idx = allArtworkIds.indexOf(currentId);
    if (idx === -1) return { prev: null, next: null };
    return {
      prev: idx > 0 ? allArtworkIds[idx - 1] : null,
      next: idx < allArtworkIds.length - 1 ? allArtworkIds[idx + 1] : null,
    };
  };

  return (
    <>
      {/* Mobile tab strip — fixed at top, scrolls away with content. Hidden
          at the `tab` breakpoint (768+) where buckets stack instead. */}
      <div
        ref={panelRef}
        className="fixed top-0 left-0 right-0 z-20 tab:hidden"
        style={{ transform: 'translateY(0)' }}
      >
        <TradesTabStrip activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <main className="bg-canvas flex-1 w-full flex flex-col tab:pb-[24px]">
        {/* Mobile content — only the active tab's bucket renders. The 80px top
            padding accounts for the fixed tab strip. `flex-1 flex flex-col`
            so empty-state children can stretch + center vertically inside the
            visible area between the tab strip and the bottom mobile nav. */}
        <div className="tab:hidden flex-1 flex flex-col pt-[80px]">
          <MobileBucketContent
            activeTab={activeTab}
            groups={groups}
            onOpenArtwork={openArtwork}
          />
        </div>

        {/* Tablet / desktop — all four buckets stacked. The Saved bucket has
            no top divider; the other three do, acting as section separators.
            Content fluid-fills the viewport (minus the 60px sidebar and 32px
            page padding) at every breakpoint — no max-width cap, so the grid
            keeps growing with the window on wide displays. */}
        <div className="hidden tab:block px-[32px] pt-[29px]">
          <SavedBucketTabletDesktop
            groups={groups}
            onOpenArtwork={openArtwork}
          />
          <PlaceholderBucket
            icon={<Edit02 className="w-[24px] h-[24px]" />}
            title="Draft Trades"
            showTopDivider
          />
          <PlaceholderBucket
            icon={<Zap className="w-[24px] h-[24px]" />}
            title="Active Trades"
            showTopDivider
          />
          <PlaceholderBucket
            icon={<CheckCircle className="w-[24px] h-[24px]" />}
            title="Completed Trades"
            showTopDivider
          />
        </div>
      </main>

      {modal && (
        <ArtworkDetailsModal
          key={modal.artwork.id}
          mode="overlay"
          artwork={modal.artwork}
          neighbors={neighborsFor(modal.artwork.id)}
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

const PLACEHOLDER_TAB_CONFIG: Record<
  Exclude<TradesTab, 'bookmarked'>,
  { icon: React.ReactNode; title: string }
> = {
  draft: {
    icon: <Edit02 className="w-[48px] h-[48px] text-accent" />,
    title: 'Draft Trades',
  },
  active: {
    icon: <Zap className="w-[48px] h-[48px] text-accent" />,
    title: 'Active Trades',
  },
  complete: {
    icon: <CheckCircle className="w-[48px] h-[48px] text-accent" />,
    title: 'Completed Trades',
  },
};

function MobileBucketContent({
  activeTab,
  groups,
  onOpenArtwork,
}: {
  activeTab: TradesTab;
  groups: BookmarkedArtistGroupData[];
  onOpenArtwork: (artworkId: string) => void;
}) {
  if (activeTab === 'bookmarked') {
    if (groups.length === 0) return <BookmarkedEmpty />;
    return (
      <div className="flex flex-col">
        {groups.map((group, i) => (
          <div key={group.artist.id}>
            <BookmarkedArtistGroup
              group={group}
              onOpenArtwork={onOpenArtwork}
            />
            {i < groups.length - 1 && (
              <div aria-hidden className="w-full h-px bg-surface" />
            )}
          </div>
        ))}
      </div>
    );
  }
  const cfg = PLACEHOLDER_TAB_CONFIG[activeTab];
  return (
    <PlaceholderEmpty icon={cfg.icon} title={cfg.title} subhead={PLACEHOLDER_COPY} />
  );
}

function SavedBucketTabletDesktop({
  groups,
  onOpenArtwork,
}: {
  groups: BookmarkedArtistGroupData[];
  onOpenArtwork: (artworkId: string) => void;
}) {
  return (
    <section>
      <BucketHeader
        icon={<Bookmark className="w-[24px] h-[24px]" strokeWidth={1.67} />}
        title="Bookmarked for Trade"
        showTopDivider={false}
      />
      {groups.length === 0 ? (
        <BookmarkedEmpty />
      ) : (
        <ArtistGroupGrid groups={groups} onOpenArtwork={onOpenArtwork} />
      )}
    </section>
  );
}

/**
 * Tablet/desktop grid of artist groups inside the Saved bucket.
 *
 * Layout matches Figma exactly at the reference widths (768 → 50.8px thumbs,
 * 1280 → 62.4px thumbs) and scales fluidly above 1280.
 *
 * Divider model:
 * - Cells are laid out with `gap-x-[32px]` and no row gap (rows are spaced by
 *   the row-divider's own `my-[15.5px]`, which gives 15.5+1+15.5 = 32px row
 *   gap with the 1px line in the middle).
 * - The row divider is a `col-span-full` grid item, so it always spans the
 *   full bucket width — even when the last row has fewer cells (3 artists in
 *   2-col → row 1 has 1 cell; the divider still spans full width).
 * - Col dividers are `::before` pseudos on cells past the first column. Their
 *   top/bottom extend `-15.5px` into adjacent row gaps, so the vertical line
 *   meets the horizontal row divider in a `+` intersection.
 *
 * Renders twice (tablet 2-col, desktop 3-col) so each breakpoint can chunk
 * the groups into its own row layout.
 */
function ArtistGroupGrid({
  groups,
  onOpenArtwork,
}: {
  groups: BookmarkedArtistGroupData[];
  onOpenArtwork: (artworkId: string) => void;
}) {
  const renderRows = (cols: number) => {
    const rows: BookmarkedArtistGroupData[][] = [];
    for (let i = 0; i < groups.length; i += cols) {
      rows.push(groups.slice(i, i + cols));
    }
    const lastRowIdx = rows.length - 1;
    return rows.map((row, ri) => {
      const isFirstRow = ri === 0;
      const isLastRow = ri === lastRowIdx;
      // Col-divider top/bottom: 0 at outer grid edges, -15.5px to extend into
      // the adjacent row gap (so the vertical line meets the row divider).
      const colTop = isFirstRow ? 'before:top-0' : 'before:-top-[15.5px]';
      const colBottom = isLastRow ? 'before:bottom-0' : 'before:-bottom-[15.5px]';
      const colDividerCls = `before:content-[""] before:absolute before:-left-[16.5px] before:w-px before:bg-surface ${colTop} ${colBottom}`;
      return (
        <Fragment key={ri}>
          {ri > 0 && (
            <div
              aria-hidden
              className="col-span-full h-px bg-surface my-[15.5px]"
            />
          )}
          {row.map((group, ci) => (
            <div
              key={group.artist.id}
              className={'relative ' + (ci > 0 ? colDividerCls : '')}
            >
              <BookmarkedArtistGroup
                group={group}
                onOpenArtwork={onOpenArtwork}
                inset
              />
            </div>
          ))}
          {/* Pad partial last row to preserve the column track widths. */}
          {row.length < cols &&
            Array.from({ length: cols - row.length }).map((_, i) => (
              <div key={`f${ri}-${i}`} aria-hidden />
            ))}
        </Fragment>
      );
    });
  };
  return (
    <>
      <div className="grid grid-cols-2 desk:hidden gap-x-[32px]">
        {renderRows(2)}
      </div>
      <div className="hidden desk:grid grid-cols-3 gap-x-[32px]">
        {renderRows(3)}
      </div>
    </>
  );
}

function PlaceholderBucket({
  icon,
  title,
  showTopDivider,
}: {
  icon: React.ReactNode;
  title: string;
  showTopDivider: boolean;
}) {
  return (
    <section className="mt-[24px] desk:mt-[32px]">
      <BucketHeader icon={icon} title={title} showTopDivider={showTopDivider} />
      <p className="font-sans text-muted text-[13px] leading-[normal]">
        {PLACEHOLDER_COPY}
      </p>
    </section>
  );
}
