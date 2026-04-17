import { Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="bg-canvas min-h-screen w-full p-[24px]">
      <Skeleton className="h-[24px] w-[200px] mb-[16px]" />
      <div className="bg-surface rounded-[8px] border border-divider p-[16px] flex flex-col gap-[8px]">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[36px] w-full" />
        ))}
      </div>
    </main>
  );
}
