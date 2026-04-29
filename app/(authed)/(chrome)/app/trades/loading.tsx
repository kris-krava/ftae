import { TradesGroupsSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="bg-canvas flex-1 w-full pt-[24px]">
      <div className="px-[16px] tab:px-[120px] desk:px-[320px]">
        <TradesGroupsSkeleton groups={6} />
      </div>
    </main>
  );
}
