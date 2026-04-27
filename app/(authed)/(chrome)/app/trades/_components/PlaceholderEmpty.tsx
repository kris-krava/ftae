import type { ReactNode } from 'react';

interface PlaceholderEmptyProps {
  icon: ReactNode;
  title: string;
  /** Body text below the title. */
  subhead: string;
}

/**
 * Mobile empty state used by the Draft / Active / Completed buckets while
 * trading is pre-launch. Same icon circle and Untitled-UI default stroke
 * weight as the Home Following-empty state, no button. Sits at its natural
 * height — no min-h, so the page never grows past the visible viewport.
 */
export function PlaceholderEmpty({ icon, title, subhead }: PlaceholderEmptyProps) {
  return (
    <div className="flex flex-col items-center text-center px-[32px] pt-[48px]">
      <div className="bg-accent/10 rounded-full w-[96px] h-[96px] flex items-center justify-center">
        {icon}
      </div>
      <h2 className="font-serif font-bold text-ink text-[28px] leading-[1.15] mt-[24px]">
        {title}
      </h2>
      <p className="font-sans text-muted text-[14px] leading-[22px] mt-[8px] max-w-[480px]">
        {subhead}
      </p>
    </div>
  );
}
