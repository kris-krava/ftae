'use client';

import { useEffect, useState } from 'react';

const TILE_BASIS =
  'basis-[calc((100%-4px)/2)] tab:basis-[calc((100%-8px)/3)] desk:basis-[calc((100%-16px)/5)]';

const FALLBACK_COLORS = [
  '#d1a680', '#85abc4', '#a6c999', '#d6998a', '#c4b57a', '#9191c7',
  '#8c7a73', '#b29e94', '#73858c', '#9e947a', '#8b6a5c', '#b8a6ad',
  '#999c7c', '#c78b6e', '#8a9eb5', '#a68b73',
];

const TAB_BREAKPOINT = 768;
const DESK_BREAKPOINT = 1280;
const GAP = 4;

// How many tiles fit in one viewport at the current breakpoint, given the
// content area width (viewport minus the desk/tablet sidebar).
function viewportFillCount(): number {
  if (typeof window === 'undefined') return 30;
  const w = window.innerWidth;
  const cols = w >= DESK_BREAKPOINT ? 5 : w >= TAB_BREAKPOINT ? 3 : 2;
  // Sidebar takes 60px on tab/desk; mobile has bottom nav (no horizontal eat).
  const contentWidth = w >= TAB_BREAKPOINT ? w - 60 : w;
  const tileSize = (contentWidth - GAP * (cols - 1)) / cols;
  if (tileSize <= 0) return cols * 2;
  const rowsNeeded = Math.ceil(window.innerHeight / tileSize);
  return rowsNeeded * cols;
}

function colsForViewport(): number {
  if (typeof window === 'undefined') return 5;
  const w = window.innerWidth;
  return w >= DESK_BREAKPOINT ? 5 : w >= TAB_BREAKPOINT ? 3 : 2;
}

// Total target tile count = max(viewportFill, ceil(actual/cols) * cols).
// Ensures the visible viewport is filled AND the last row is never partial
// (which would otherwise leak the canvas color through empty grid cells).
function targetCount(actual: number): number {
  const cols = colsForViewport();
  const roundedActual = Math.ceil(actual / cols) * cols;
  return Math.max(roundedActual, viewportFillCount());
}

interface SkeletonFillTilesProps {
  /** Number of real tiles already rendered. Skeletons fill up from there. */
  actualCount: number;
}

export function SkeletonFillTiles({ actualCount }: SkeletonFillTilesProps) {
  // SSR has no viewport — render zero placeholders on the server so client
  // hydration matches. The effect below fills in the real count one frame
  // after mount.
  const [count, setCount] = useState(0);

  useEffect(() => {
    const recompute = () => setCount(Math.max(0, targetCount(actualCount) - actualCount));
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [actualCount]);

  if (count === 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const idx = actualCount + i;
        return (
          <div key={`skel-${i}`} className={`${TILE_BASIS} shrink-0`} aria-hidden>
            <div
              className="relative aspect-square rounded-[2px] block w-full"
              style={{ backgroundColor: FALLBACK_COLORS[idx % FALLBACK_COLORS.length] }}
            />
          </div>
        );
      })}
    </>
  );
}
