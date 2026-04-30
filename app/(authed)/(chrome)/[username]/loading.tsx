import { Skeleton } from '@/components/Skeleton';

// Mirrors the populated profile shell so the swap from skeleton → real
// content doesn't shift the page. The Sidebar/MobileNav chrome is provided
// by app/(authed)/layout.tsx and renders BEHIND this Suspense boundary —
// no need to re-draw it here.
export default function Loading() {
  return (
    <main
      aria-busy
      className={
        'bg-canvas min-h-screen w-full flex flex-col items-center ' +
        'pt-[32px] pb-[96px] tab:pb-[24px]'
      }
    >
      <section className="w-full flex flex-col items-center px-[32px] tab:px-[40px] desk:px-[80px]">
        <div className="w-full max-w-[326px] tab:max-w-[480px] desk:max-w-[580px] flex flex-col items-center">
          <Skeleton className="w-[180px] h-[180px] rounded-full" />
          <div className="h-[10px]" />
          <Skeleton className="w-[180px] h-[24px] tab:h-[28px] desk:h-[32px]" />
          <div className="h-[8px]" />
          <Skeleton className="w-[100px] h-[16px]" />
          <div className="h-[6px]" />
          <Skeleton className="w-[120px] h-[16px]" />
          <div className="h-[22px]" />
          <div className="flex gap-[8px]">
            <Skeleton className="w-[60px] h-[26px] rounded-[20px]" />
            <Skeleton className="w-[80px] h-[26px] rounded-[20px]" />
            <Skeleton className="w-[68px] h-[26px] rounded-[20px]" />
          </div>
          <div className="h-[18px]" />
          <Skeleton className="w-[260px] h-[14px]" />
          <div className="h-[16px]" />
          <Skeleton className="w-[140px] h-[14px]" />
          <div className="h-[4px]" />
          <Skeleton className="w-[160px] h-[14px]" />
          <div className="h-[18px]" />
          <span aria-hidden className="block w-full h-px bg-divider/60" />
        </div>
      </section>
    </main>
  );
}
