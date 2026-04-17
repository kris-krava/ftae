import { ArtworkGridSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="bg-canvas min-h-screen w-full">
      <header className="bg-canvas h-[56px] flex items-center pt-[30px] px-[32px] tab:px-[120px] desk:px-[320px]">
        <h1 className="font-sans font-semibold text-[18px] text-ink">Discover</h1>
      </header>
      <div className="pt-[12px] pb-[14px] px-[32px] tab:px-[120px] desk:px-[320px]">
        <div className="bg-surface rounded-[10px] h-[44px] border border-divider/60" />
      </div>
      <ArtworkGridSkeleton tiles={12} />
    </main>
  );
}
