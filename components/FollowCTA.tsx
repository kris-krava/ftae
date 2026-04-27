import Link from 'next/link';
import { XClose } from '@/components/icons';

interface FollowCTAProps {
  onClose?: () => void;
}

export function FollowCTA({ onClose }: FollowCTAProps) {
  return (
    <div className="w-[310px] bg-surface rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-[20px] py-[16px] flex flex-col items-center gap-[8px]">
      <div className="flex items-start gap-[8px] w-full">
        <p className="flex-1 min-w-0 font-sans font-medium text-[13px] leading-[20px] text-ink">
          Follow more artists to see more art!
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss follow card"
            className="shrink-0 w-[24px] h-[24px] flex items-center justify-center text-muted"
          >
            <XClose className="w-[20px] h-[20px]" />
          </button>
        )}
      </div>
      <Link
        href="/app/discover"
        className="bg-accent text-surface font-sans font-semibold text-[13px] leading-[20px] rounded-[8px] px-[16px] py-[8px]"
      >
        Discover Artists
      </Link>
    </div>
  );
}
