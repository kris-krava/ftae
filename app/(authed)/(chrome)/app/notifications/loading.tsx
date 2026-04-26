import { NotificationListSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="bg-canvas flex-1 w-full pt-[32px]">
      <div className="px-[32px] tab:px-[120px] desk:px-[320px]">
        <NotificationListSkeleton />
      </div>
    </main>
  );
}
