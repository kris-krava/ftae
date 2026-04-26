import Link from 'next/link';

export function FollowCTA() {
  return (
    <div className="w-[310px] bg-surface rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-[20px] py-[16px] flex flex-col items-center gap-[8px]">
      <p className="font-sans text-[13px] leading-[20px] text-ink text-center">
        Follow more artists to see more art!
      </p>
      <Link
        href="/app/discover"
        className="bg-accent text-surface font-sans font-semibold text-[13px] leading-[20px] rounded-[8px] px-[16px] py-[8px]"
      >
        Discover Artists
      </Link>
    </div>
  );
}
