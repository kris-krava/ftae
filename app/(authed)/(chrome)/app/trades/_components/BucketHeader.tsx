import type { ReactNode } from 'react';

interface BucketHeaderProps {
  icon: ReactNode;
  title: string;
  /** When false, no top divider — used on the first bucket of tablet/desktop. */
  showTopDivider?: boolean;
}

/**
 * Section header used above each Trades bucket on tablet/desktop.
 * When `showTopDivider` is true, renders a 1px divider with 14px gap before the
 * icon+title row. Title row always has 12px bottom space before the next sibling.
 */
export function BucketHeader({ icon, title, showTopDivider = true }: BucketHeaderProps) {
  return (
    <div className="flex flex-col pb-[12px]">
      {showTopDivider && (
        <div aria-hidden className="w-full h-px bg-divider mb-[14px]" />
      )}
      <div className="flex items-center gap-[12px]">
        <span aria-hidden className="text-muted shrink-0 [&_path]:[stroke-width:1.67]">
          {icon}
        </span>
        <h2 className="font-sans font-semibold text-ink text-[16px] leading-[24px]">
          {title}
        </h2>
      </div>
    </div>
  );
}
