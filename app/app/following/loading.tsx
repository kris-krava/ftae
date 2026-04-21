import { ArtworkGridSkeleton, StatsModuleSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="bg-canvas flex-1 w-full relative">
      <header className="bg-canvas h-[56px] flex items-center pt-[30px] px-[32px] tab:px-[120px] desk:px-[320px]">
        <h1 className="font-sans font-semibold text-[18px] text-ink">Following</h1>
      </header>
      <ArtworkGridSkeleton tiles={16} />
      <div aria-hidden className="pointer-events-none fixed inset-0 top-[56px] bottom-[80px] tab:bottom-0 tab:left-[60px] bg-black/40 z-20" />
      <div className="fixed inset-x-0 z-30 flex justify-center px-[22px] top-[280px] tab:top-[425px] desk:top-[363px] tab:left-[60px] tab:right-0">
        <StatsModuleSkeleton />
      </div>
    </main>
  );
}
