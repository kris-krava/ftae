import { ArtworkGridSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="bg-canvas flex-1 w-full min-h-dvh">
      <ArtworkGridSkeleton />
    </main>
  );
}
