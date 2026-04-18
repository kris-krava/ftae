'use client';

import { useEffect, useState } from 'react';
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className={
        'w-full bg-ink flex flex-col items-center ' +
        'px-[24px] py-[48px] ' +
        'tab:pt-[56px] tab:pb-[72px] tab:gap-[32px] ' +
        'desk:px-[160px] desk:pt-[64px] desk:pb-[80px] desk:gap-[40px]'
      }
    >
      <p className="font-sans font-medium text-[11px] tracking-[2px] text-canvas text-center w-full">
        PREPARING FOR LAUNCH
      </p>

      <div className="flex flex-col w-full mt-[32px] tab:hidden">
        <StatTile value={stats?.foundingArtists ?? null} label="Founding Artists" />
        <span aria-hidden="true" className="self-center bg-divider h-px w-[326px]" />
        <StatTile value={stats?.piecesToTrade ?? null} label="Pieces to Trade" />
        <span aria-hidden="true" className="self-center bg-divider h-px w-[326px]" />
        <StatTile value={stats?.daysUntilLaunch ?? null} label="Days Until Launch" />
      </div>

      <div className="hidden tab:flex bg-canvas items-center w-full">
        <StatTile value={stats?.foundingArtists ?? null} label="Founding Artists" />
        <span aria-hidden="true" className="bg-divider w-px h-[88px] desk:h-[100px]" />
        <StatTile value={stats?.piecesToTrade ?? null} label="Pieces to Trade" />
        <span aria-hidden="true" className="bg-divider w-px h-[88px] desk:h-[100px]" />
        <StatTile value={stats?.daysUntilLaunch ?? null} label="Days Until Launch" />
      </div>
    </section>
  );
}

function StatTile({ value, label }: { value: number | null; label: string }) {
  const display = value === null ? '\u2014' : value.toLocaleString('en-US');
  return (
    <div
      className={
        'flex-1 min-w-0 bg-muted text-canvas text-center whitespace-nowrap ' +
        'flex flex-col items-center justify-center ' +
        'px-[16px] py-[24px] gap-[8px] ' +
        'tab:px-[16px] tab:py-[32px] ' +
        'desk:px-[24px] desk:py-[32px] desk:gap-[10px]'
      }
    >
      <span
        className={
          'font-sans font-extrabold tracking-[-1.5px] ' +
          'text-[56px] leading-[64px] ' +
          'tab:text-[64px] tab:leading-[72px] ' +
          'desk:text-[80px] desk:leading-[88px] desk:tracking-[-2px]'
        }
      >
        {display}
      </span>
      <span className="font-sans font-medium text-[14px] leading-[20px] desk:text-[15px] desk:leading-[22px]">
        {label}
      </span>
    </div>
  );
}
