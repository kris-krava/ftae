'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import type { LandingStats } from '@/app/_lib/landing-stats';

// Per-breakpoint content widths match Figma's onboarding-style cap (326/520/580).
// 326 is the Figma frame's content column on mobile, so wrapping mirrors the
// designs on any phone ≥ 390px wide.
const STATS_MAXW = 'max-w-[360px] tab:max-w-[520px] desk:max-w-[580px]';

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

  // Real count once /api/stats resolves. In local development we substitute
  // 999 for empty/zero counts so the layout can be evaluated against the
  // designs without seeded data; production keeps the truthful "0" or "—".
  const isDev = process.env.NODE_ENV !== 'production';
  const real = stats?.piecesToTrade ?? null;
  const count =
    real == null
      ? isDev
        ? '999'
        : '—'
      : real === 0 && isDev
        ? '999'
        : real.toLocaleString('en-US');

  return (
    <section
      className={
        'w-full bg-accent text-canvas text-center ' +
        'py-[56px] tab:py-[80px] desk:py-[56px]'
      }
    >
      <div className="w-full px-[15px] tab:px-[124px] desk:px-[350px]">
        <div className={`${STATS_MAXW} mx-auto flex flex-col items-center`}>
          <p
            className={
              'font-sans font-medium uppercase ' +
              'text-[12px] leading-[16px] tracking-[1.92px] ' +
              'tab:text-[13px] tab:leading-[18px] tab:tracking-[2.08px] ' +
              'desk:text-[14px] desk:leading-[20px] desk:tracking-[2.24px]'
            }
          >
            Founding Artists Have Posted
          </p>

          <p
            className={
              'font-serif font-bold ' +
              'mt-[10px] text-[88px] leading-[92px] tracking-[-2px] ' +
              'tab:mt-[7px] tab:text-[128px] tab:leading-[132px] tab:tracking-[-3.5px] ' +
              'desk:mt-[8px] desk:text-[180px] desk:leading-[184px] desk:tracking-[-5px]'
            }
          >
            {count} pieces.
          </p>

          <p
            className={
              'font-serif italic ' +
              'mt-[8px] text-[22px] leading-[30px] ' +
              'tab:mt-[8px] tab:text-[26px] tab:leading-[36px] ' +
              'desk:mt-[12px] desk:text-[32px] desk:leading-[40px]'
            }
          >
            Find the ones you love.
          </p>

          <div
            className={
              'bg-white/50 ' +
              'mt-[27px] h-px w-[48px] ' +
              'tab:mt-[32px] tab:w-[56px] ' +
              'desk:mt-[36px] desk:w-[72px]'
            }
          />

          <p
            className={
              'font-sans ' +
              'mt-[20px] text-[13px] leading-[20px] ' +
              'tab:mt-[24px] tab:text-[14px] tab:leading-[22px] ' +
              'desk:mt-[28px] desk:text-[15px] desk:leading-[24px]'
            }
          >
            Counting up to July 1, 2026. Trading begins.
          </p>
        </div>
      </div>
    </section>
  );
}
