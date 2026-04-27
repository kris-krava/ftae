import Link from 'next/link';
import { Bookmark } from '@/components/icons';

export function BookmarkedEmpty() {
  return (
    <div className="flex flex-col items-center text-center px-[32px] pt-[48px] tab:py-[48px]">
      <div className="bg-accent/10 rounded-full w-[96px] h-[96px] flex items-center justify-center">
        <Bookmark className="w-[48px] h-[48px] text-accent" />
      </div>
      <h2 className="font-serif font-bold text-ink text-[28px] tab:text-[32px] leading-[1.15] mt-[24px]">
        Bookmark for Trade
      </h2>
      <p className="font-sans text-muted text-[14px] leading-[22px] mt-[8px] max-w-[480px]">
        Bookmark artwork you&rsquo;d like to trade for.
      </p>
      <Link
        href="/app/discover"
        className="mt-[24px] inline-flex items-center justify-center rounded-[8px] bg-accent px-[24px] h-[48px] font-sans font-semibold text-[16px] leading-[24px] text-surface"
      >
        Discover Artists
      </Link>
    </div>
  );
}
