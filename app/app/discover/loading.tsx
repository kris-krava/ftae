import { ArtworkGridSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="bg-canvas flex-1 w-full">
      <div className="pt-[16px] pb-[16px] tab:pt-[26px] tab:pb-[26px] px-[32px] tab:px-[120px] desk:px-[320px]">
        <div className="bg-surface rounded-[10px] h-[44px] border border-divider/60" />
      </div>
      <ArtworkGridSkeleton tiles={12} />
    </main>
  );
}
