import { NotificationListSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="bg-canvas min-h-screen w-full">
      <header className="px-[32px] tab:px-[120px] desk:px-[320px] pt-[30px] pb-[16px]">
        <h1 className="font-sans font-semibold text-[18px] leading-none text-ink">Notifications</h1>
      </header>
      <div className="px-[32px] tab:px-[120px] desk:px-[320px]">
        <NotificationListSkeleton />
      </div>
    </main>
  );
}
