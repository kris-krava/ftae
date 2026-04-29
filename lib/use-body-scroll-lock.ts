'use client';

import { useEffect } from 'react';

// Module-level ref-counter so stacked modals don't clobber each other's lock
// state. The first locker captures the prior style; the last unlocker restores
// it. `padding-right` compensation prevents a layout shift when the viewport
// scrollbar disappears on desktop.
let lockCount = 0;
const saved = {
  htmlOverflow: '',
  bodyOverflow: '',
  bodyPaddingRight: '',
};

export function useBodyScrollLock(active: boolean = true): void {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      const html = document.documentElement;
      const body = document.body;
      const gap = window.innerWidth - html.clientWidth;

      saved.htmlOverflow = html.style.overflow;
      saved.bodyOverflow = body.style.overflow;
      saved.bodyPaddingRight = body.style.paddingRight;

      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      if (gap > 0) {
        const current = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
        body.style.paddingRight = `${current + gap}px`;
      }
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        const html = document.documentElement;
        const body = document.body;
        html.style.overflow = saved.htmlOverflow;
        body.style.overflow = saved.bodyOverflow;
        body.style.paddingRight = saved.bodyPaddingRight;
      }
    };
  }, [active]);
}
