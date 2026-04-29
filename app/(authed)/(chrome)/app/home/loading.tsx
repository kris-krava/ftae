import { ArtworkGridSkeleton } from '@/components/Skeleton';

// Skeleton bleeds off the bottom of the viewport (12 rows on mobile = ~6
// viewports) so the page feels like there's more content streaming in,
// not a finite empty state.
export default function Loading() {
  return (
    <main className="bg-canvas flex-1 w-full">
      <div className="px-[32px] tab:px-[120px] desk:px-[320px] pt-[16px] tab:pt-[26px] pb-[16px] tab:pb-[26px]">
        <ArtworkGridSkeleton rows={18} />
      </div>
    </main>
  );
}
