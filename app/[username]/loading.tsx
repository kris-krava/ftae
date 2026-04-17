import { Skeleton, ArtworkGridSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="bg-canvas min-h-screen w-full flex flex-col items-center pt-[68px] px-[32px] tab:px-[40px] desk:px-[80px] pb-[24px]">
      <div className="w-full max-w-[326px] tab:max-w-[480px] desk:max-w-[580px] flex flex-col items-center">
        <Skeleton className="w-[193px] h-[193px] rounded-full" />
        <div className="h-[20px]" />
        <Skeleton className="w-[160px] h-[28px]" />
        <div className="h-[8px]" />
        <Skeleton className="w-[120px] h-[14px]" />
        <div className="h-[40px]" />
        <Skeleton className="w-full h-px bg-divider/60" />
        <div className="h-[14px]" />
        <ArtworkGridSkeleton tiles={6} />
      </div>
    </main>
  );
}
