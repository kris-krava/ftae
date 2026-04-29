'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Traps keyboard focus inside a modal dialog.
 *
 * - On mount, focuses the first focusable element inside the container.
 * - Tab from the last focusable wraps to the first; Shift+Tab from the
 *   first wraps to the last.
 * - On unmount, returns focus to whatever was focused before the modal
 *   opened (so the user lands back where they came from).
 * - Plays nicely with nested modals (e.g., ArtForm + its delete-confirm
 *   at z-60) — the inner trap stops Tab events from bubbling to the
 *   outer, so the outer doesn't double-handle and yank focus.
 *
 * Usage:
 *   const ref = useFocusTrap();
 *   return <div ref={ref} role="dialog">…</div>;
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean = true,
): React.RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const visibleFocusables = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null,
      );

    // Initial focus — first focusable, or the container itself as a
    // fallback so screen readers announce the dialog.
    const initial = visibleFocusables();
    if (initial.length > 0) {
      initial[0].focus();
    } else if (container.tabIndex < 0) {
      container.tabIndex = -1;
      container.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = visibleFocusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          e.stopPropagation();
          last.focus();
        }
      } else if (activeEl === last) {
        e.preventDefault();
        e.stopPropagation();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      // Use a microtask so any onClose-driven re-renders settle before we
      // restore focus. Otherwise focus can land on a transitional element
      // that immediately unmounts.
      queueMicrotask(() => {
        if (previouslyFocused && document.contains(previouslyFocused)) {
          previouslyFocused.focus();
        }
      });
    };
  }, [active]);

  return ref as React.RefObject<T>;
}
