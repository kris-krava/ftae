'use client';

import { Bookmark, Edit02, Zap, CheckCircle } from '@/components/icons';
import type { TradesTab } from './tabs';

interface TradesTabStripProps {
  activeTab: TradesTab;
  onChange: (tab: TradesTab) => void;
}

const TABS: { id: TradesTab; label: string; Icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { id: 'bookmarked', label: 'Bookmarked', Icon: Bookmark },
  { id: 'draft', label: 'Drafts', Icon: Edit02 },
  { id: 'active', label: 'Active', Icon: Zap },
  { id: 'complete', label: 'Completed', Icon: CheckCircle },
];

/**
 * Mobile tab strip. Each cell is 1/4 width × 80h, matching the global Mobile
 * Nav Bar treatment. Active tab gets the accent stroke + 20×3 underline.
 * Inactive cells render at the muted color and stroke 1.67 (mirroring the
 * inactive icons in the bottom nav).
 */
export function TradesTabStrip({ activeTab, onChange }: TradesTabStripProps) {
  return (
    <div className="bg-surface h-[80px] w-full relative">
      <div aria-hidden className="absolute left-0 right-0 top-[79px] h-px bg-divider" />
      <ul className="flex h-[80px] items-stretch">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = id === activeTab;
          return (
            <li key={id} className="flex-1 min-w-0 relative">
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-label={label}
                aria-pressed={isActive}
                className="absolute inset-0 flex items-start justify-center pt-[24px]"
              >
                <Icon
                  className={
                    'w-[24px] h-[24px] ' +
                    (isActive
                      ? 'text-accent [&_path]:[stroke-width:2.2]'
                      : 'text-muted [&_path]:[stroke-width:1.67]')
                  }
                  strokeWidth={isActive ? 2.2 : 1.67}
                />
              </button>
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 top-[70px] w-[20px] h-[3px] rounded-[1.5px] bg-accent"
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
