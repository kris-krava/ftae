import { Shuffle01 } from '@/components/icons';
import { getDaysUntilLaunch } from '@/app/_lib/launch-countdown';

export const dynamic = 'force-dynamic';

export default async function TradesPage() {
  const days = await getDaysUntilLaunch();
  const headline = days === null ? 'Trading starts soon!' : `Trading starts in ${days} day${days === 1 ? '' : 's'}!`;

  return (
    <main className="bg-canvas flex-1 w-full flex flex-col items-center justify-center px-[32px]">
      <div className="bg-accent/10 rounded-full w-[96px] h-[96px] flex items-center justify-center">
        <Shuffle01 className="w-[48px] h-[48px] text-accent" />
      </div>
      <h1 className="font-serif font-bold text-ink text-[24px] text-center mt-[40px] max-w-[326px] tab:max-w-[480px] desk:max-w-[640px]">
        {headline}
      </h1>
      <p className="font-sans text-muted text-[15px] text-center mt-[12px] max-w-[326px] tab:max-w-[480px] desk:max-w-[640px]">
        Active and completed trades live here.
      </p>
    </main>
  );
}
