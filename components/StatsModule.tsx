import { ReferralShare } from '@/components/ReferralShare';

interface StatsModuleProps {
  foundingMembers: number;
  piecesToTrade: number;
  daysUntilLaunch: number | null;
  referralUrl: string;
  className?: string;
}

export function StatsModule({
  foundingMembers,
  piecesToTrade,
  daysUntilLaunch,
  referralUrl,
  className,
}: StatsModuleProps) {
  const days = daysUntilLaunch === null ? '\u2014' : String(daysUntilLaunch);
  return (
    <div
      className={
        `bg-surface/95 rounded-[16px] shadow-[0_8px_28px_rgba(26,13,13,0.22)] ` +
        `w-[346px] tab:w-[480px] desk:w-[560px] p-[24px] ${className ?? ''}`
      }
    >
      <div className="grid grid-cols-3 gap-x-[12px]">
        <Stat number={foundingMembers.toLocaleString('en-US')} label1="Founding" label2="Members" showDivider={false} />
        <Stat number={piecesToTrade.toLocaleString('en-US')} label1="Pieces to" label2="Trade" showDivider />
        <Stat number={days} label1="Days Until" label2="Launch" showDivider />
      </div>
      <span aria-hidden className="block w-full h-px bg-divider/50 mt-[16px]" />
      <p className="font-sans font-semibold text-[14px] text-ink text-center mt-[12px]">
        Invite artists you know
      </p>
      <ReferralShare referralUrl={referralUrl} className="mt-[12px]" />
    </div>
  );
}

function Stat({
  number,
  label1,
  label2,
  showDivider,
}: {
  number: string;
  label1: string;
  label2: string;
  showDivider: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center">
      {showDivider && (
        <span aria-hidden className="absolute -left-[6px] top-0 bottom-[8px] w-px bg-divider" />
      )}
      <p className="font-sans font-extrabold text-ink text-[26px] tab:text-[28px] leading-none text-center">
        {number}
      </p>
      <p className="font-sans font-medium text-muted text-[11px] text-center mt-[6px] leading-tight">
        {label1}
        <br />
        {label2}
      </p>
    </div>
  );
}
