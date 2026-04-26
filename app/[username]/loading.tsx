import { Skeleton } from '@/components/Skeleton';

// Mirrors the populated profile (page.tsx + ProfileHeader + ArtworkGrid +
// Sidebar/MobileNav) so the swap from skeleton → real content doesn't shift
// the page. /[username] is outside the /app/* layout tree, so the chrome
// isn't provided by a parent layout — we have to draw it here too.
export default function Loading() {
  return (
    <>
      <SidebarSkeleton />
      <MobileNavSkeleton />

      <main
        aria-busy
        className={
          'bg-canvas min-h-screen w-full flex flex-col items-center ' +
          'pt-[32px] pb-[96px] tab:pb-[24px] tab:pl-[60px] desk:pl-[60px]'
        }
      >
        <section className="w-full flex flex-col items-center px-[32px] tab:px-[40px] desk:px-[80px]">
          <div className="w-full max-w-[326px] tab:max-w-[480px] desk:max-w-[580px] flex flex-col items-center">
            <Skeleton className="w-[96px] h-[96px] rounded-full" />
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
    </>
  );
}

function SidebarSkeleton() {
  return (
    <aside
      aria-hidden
      className="fixed top-0 left-0 bottom-0 hidden tab:block bg-surface w-[60px] z-40"
    >
      <span aria-hidden className="absolute right-0 top-0 bottom-0 w-px bg-divider/50" />
      <div className="h-[80px]" />
      <ul className="mt-[30px] flex flex-col gap-[6px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-[48px] mx-[6px] px-[12px] flex items-center">
            <Skeleton className="w-[24px] h-[24px] rounded-[6px]" />
          </li>
        ))}
      </ul>
      <div className="absolute bottom-[24px] left-[14px]">
        <Skeleton className="w-[32px] h-[32px] rounded-full" />
      </div>
    </aside>
  );
}

function MobileNavSkeleton() {
  return (
    <nav
      aria-hidden
      className="fixed bottom-0 inset-x-0 h-[80px] bg-surface tab:hidden z-40"
    >
      <span aria-hidden className="absolute top-0 inset-x-0 h-px bg-divider/50" />
      <ul className="grid grid-cols-6 h-full items-center justify-items-center">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center justify-center w-[65px] h-[80px]">
            <Skeleton
              className={
                i === 4
                  ? 'w-[28px] h-[28px] rounded-full'
                  : 'w-[24px] h-[24px] rounded-[6px]'
              }
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
