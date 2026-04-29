import { ArtworkGridSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="bg-canvas flex-1 w-full min-h-dvh">
      {/* Top panel — search bar shape matching the live DiscoverClient
          panel sizing so the skeleton lines up with the real layout. */}
      <div className="pt-[16px] pb-[16px] tab:pt-[26px] tab:pb-[26px] px-[32px] tab:px-0">
        <Skeleton className="mx-auto w-full tab:w-[528px] desk:w-[640px] h-[44px] rounded-[10px]" />
      </div>
      <ArtworkGridSkeleton />
    </main>
  );
}
