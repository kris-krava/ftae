'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import type { LandingStats } from '@/app/_lib/landing-stats';

// Mirrors the per-breakpoint content widths used on the rest of the landing
// (see app/page.tsx). The accent-orange band still fills the viewport edge to
// edge; the stats card itself caps at the Figma content widths so it doesn't
// stretch unreadably wide on tablet-and-up screens.
const STATS_MAXW = 'max-w-[294px] tab:max-w-[388px] desk:max-w-[580px]';

export function StatsBand() {
  const [stats, setStats] = useState<LandingStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stats', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LandingStats | null) => {
        if (!cancelled && data) setStats(data);
      })
      .catch((err) => {
        Sentry.captureException(err, { tags: { component: 'StatsBand' } });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const display =
    stats?.piecesToTrade == null ? '—' : stats.piecesToTrade.toLocaleString('en-US');

  return (
    <section
      className={
        'w-full bg-accent py-[48px] ' +
        'tab:py-[64px] ' +
        'desk:py-[80px]'
      }
    >
      <div className="w-full px-[24px]">
        <div className={`${STATS_MAXW} mx-auto flex flex-col items-stretch`}>
          <LaunchTab text="Founding Artists Have Posted" position="top" />
          <div
            className={
              'bg-muted text-canvas flex flex-col items-center justify-center ' +
              'px-[32px] py-[24px] gap-[10px] ' +
              'tab:px-[40px] tab:py-[32px] tab:gap-[12px]'
            }
          >
            <span
              className={
                'font-sans font-extrabold tracking-[-1.5px] ' +
                'text-[72px] leading-[80px] ' +
                'tab:text-[88px] tab:leading-[96px] ' +
                'desk:text-[112px] desk:leading-[120px] desk:tracking-[-2px]'
              }
            >
              {display}
            </span>
            <span className="font-sans font-medium text-[14px] leading-[20px] tab:text-[15px] tab:leading-[22px] desk:text-[16px] desk:leading-[24px]">
              Pieces Ready to Trade
            </span>
          </div>
          <LaunchTab text="JULY 1, 2026  —  TRADING BEGINS" position="bottom" />
        </div>
      </div>
    </section>
  );
}

// position controls which corners are rounded so the three stacked tiles
// read as a single 8px-radius card with a flush middle band.
function LaunchTab({ text, position }: { text: string; position: 'top' | 'bottom' }) {
  const radius = position === 'top' ? 'rounded-t-[8px]' : 'rounded-b-[8px]';
  return (
    <div className={`w-full bg-ink flex items-center justify-center py-[12px] tab:py-[14px] ${radius}`}>
      <span
        className={
          'font-sans font-extrabold text-field text-center tracking-[2px] ' +
          'text-[12px] leading-[18px] tab:text-[13px] tab:leading-[20px] desk:text-[14px] desk:leading-[22px]'
        }
      >
        {text}
      </span>
    </div>
  );
}
