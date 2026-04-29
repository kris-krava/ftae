'use client';

import { useEffect, useRef } from 'react';

/**
 * Shared "scroll-down hides, scroll-up reveals" interaction.
 *
 * Used by Discover (top search/referral panel) and Home (Follow CTA card).
 * The pattern in both places:
 *
 * - **Scroll down**: the element translates up off-screen, glued to scroll
 *   position frame-by-frame. No animation.
 * - **Scroll up**: the element translates back down, glued frame-by-frame.
 *   Once it reaches offset=0 it locks fully visible — the user doesn't have
 *   to return to the top to see it again. Mount the element on first
 *   reveal so the slide-down is over real content.
 * - **Dwell**: after `dwellMs` of stillness, animate the element into a
 *   visible position. Default: full reveal (offset=0). Override
 *   `dwellRevealTarget` for partial reveals (e.g., Discover shows just the
 *   search bar after dwell, not the full search+referral panel).
 * - **iOS rubber-band defense**: `window.scrollY` is clamped to 0 on read,
 *   because Safari briefly reports negative values during the overscroll
 *   pull and snaps back through 0 on release. Without clamping, the recovery
 *   frame computes a positive dy and pushes the element off-screen even
 *   though the user never scrolled down.
 *
 * The config is stored in a ref that's updated each render, so callbacks
 * always see fresh closures while the scroll listener is mounted only once.
 */

export interface UseReverseScrollRevealConfig {
  /** Initial vertical offset in px. 0 = visible; >0 = hidden by that much. */
  initialOffset: number;
  /** Milliseconds of scroll-stillness before the dwell-reveal fires. */
  dwellMs: number;
  /** Max offset (the "fully hidden" position). Called fresh per scroll
   *  event so it can reflect dynamic measurements (e.g. ResizeObserver
   *  updates when a child mounts). */
  hideDistance: () => number;
  /** Pause the dwell timer when this returns true (e.g., a modal is open). */
  isPaused: () => boolean;
  /** Skip the entire reveal when this returns true (user has dismissed). */
  isDismissed: () => boolean;
  /** Apply the offset to the DOM. `animated` toggles a CSS transition. */
  apply: (offset: number, animated: boolean) => void;
  /** Fires whenever offset moves toward visible (dwell or scroll-up).
   *  Use this to mount the element so its slide-down is over real content. */
  onReveal?: () => void;
  /** Compute the dwell-reveal target offset. Default: 0 (full reveal). */
  dwellRevealTarget?: (currentOffset: number, hideDistance: number) => number;
}

export interface UseReverseScrollRevealHandle {
  /** Programmatically snap to offset=0 with animation. Used to force-reveal
   *  in response to e.g. opening a search overlay. */
  snapToZero: () => void;
  /** Manually kick the dwell timer. Useful after a paused state ends. */
  triggerDwell: () => void;
}

export function useReverseScrollReveal(
  config: UseReverseScrollRevealConfig,
): React.MutableRefObject<UseReverseScrollRevealHandle> {
  const cfgRef = useRef(config);
  cfgRef.current = config;
  const handleRef = useRef<UseReverseScrollRevealHandle>({
    snapToZero: () => {},
    triggerDwell: () => {},
  });

  useEffect(() => {
    let dwellTimer: number | null = null;
    let lastY = Math.max(0, window.scrollY);
    let offset = cfgRef.current.initialOffset;

    const dwellReveal = () => {
      if (cfgRef.current.isDismissed()) return;
      const target = cfgRef.current.dwellRevealTarget
        ? cfgRef.current.dwellRevealTarget(offset, cfgRef.current.hideDistance())
        : 0;
      if (offset === target) return;
      offset = target;
      cfgRef.current.onReveal?.();
      cfgRef.current.apply(offset, true);
    };

    const snapToZero = () => {
      if (offset === 0) return;
      offset = 0;
      cfgRef.current.apply(offset, true);
    };

    const startDwell = () => {
      if (dwellTimer) window.clearTimeout(dwellTimer);
      if (cfgRef.current.isPaused() || cfgRef.current.isDismissed()) return;
      dwellTimer = window.setTimeout(() => {
        if (cfgRef.current.isPaused() || cfgRef.current.isDismissed()) return;
        dwellReveal();
      }, cfgRef.current.dwellMs);
    };

    handleRef.current = { snapToZero, triggerDwell: startDwell };

    const onScroll = () => {
      const cur = Math.max(0, window.scrollY);
      const dy = cur - lastY;
      lastY = cur;
      startDwell();
      if (dy > 0) {
        offset = Math.min(offset + dy, cfgRef.current.hideDistance());
        cfgRef.current.apply(offset, false);
      } else if (dy < 0) {
        offset = Math.max(offset + dy, 0);
        cfgRef.current.onReveal?.();
        cfgRef.current.apply(offset, false);
      }
    };

    startDwell();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (dwellTimer) window.clearTimeout(dwellTimer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return handleRef;
}
