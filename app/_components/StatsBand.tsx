'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import type { LandingStats } from '@/app/_lib/landing-stats';

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
    stats?.piecesToTrade == null ? '\u2014' : stats.piecesToTrade.toLocaleString('en-US');

  return (
    <section
      className={
        'w-full bg-accent flex flex-col items-stretch ' +
        'px-[32px] py-[48px] gap-[0px] ' +
        'tab:px-[124px] tab:py-[64px] ' +
        'desk:px-[350px] desk:py-[80px]'
      }
    >
      <LaunchTab text="Preparing for Launch" />
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
      <LaunchTab text="JULY 1, 2026  —  TRADING BEGINS" />
    </section>
  );
}

function LaunchTab({ text }: { text: string }) {
  return (
    <div className="w-full bg-ink flex items-center justify-center py-[12px] tab:py-[14px]">
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
