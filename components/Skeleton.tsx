interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse bg-divider/40 rounded-[6px] ${className ?? ''}`} />;
}

export function ArtistCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-[16px] w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="bg-surface border border-field/35 rounded-[12px] p-[16px] flex gap-[12px]">
          <Skeleton className="w-[48px] h-[48px] rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-[6px]">
            <Skeleton className="h-[15px] w-[140px]" />
            <Skeleton className="h-[13px] w-[100px]" />
            <Skeleton className="h-[13px] w-[160px]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NotificationListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-[8px] w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="bg-surface flex items-center gap-[12px] h-[72px] px-[14px]">
          <Skeleton className="w-[36px] h-[36px] rounded-[10px] shrink-0" />
          <div className="flex-1 flex flex-col gap-[4px]">
            <Skeleton className="h-[14px] w-[180px]" />
            <Skeleton className="h-[13px] w-[140px]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StatsModuleSkeleton() {
  return (
    <Skeleton className="rounded-[16px] w-[346px] h-[230px] tab:w-[480px] desk:w-[560px]" />
  );
}

// Square artwork tiles in the same flex layout as DiscoverArtworkTile usage
// in HomeFeedClient/DiscoverClient. Sized to match TILE_BASIS so the
// skeleton lays out exactly like the real grid.
const ARTWORK_TILE_BASIS =
  'basis-[calc((100%-4px)/2)] tab:basis-[calc((100%-8px)/3)] desk:basis-[calc((100%-16px)/5)]';

export function ArtworkGridSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <ul className="flex flex-wrap gap-[4px] tab:gap-[4px] desk:gap-[4px] w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className={`${ARTWORK_TILE_BASIS} aspect-square shrink-0`}>
          <Skeleton className="w-full h-full rounded-[2px]" />
        </li>
      ))}
    </ul>
  );
}

// Mirrors TradesClient: tab strip + a few "artist group" rows (avatar +
// name strip + a row of square thumbnail placeholders).
export function TradesGroupsSkeleton({ groups = 4 }: { groups?: number }) {
  return (
    <>
      <div className="flex gap-[12px] tab:gap-[16px] mb-[24px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[32px] w-[88px] rounded-full" />
        ))}
      </div>
      <ul className="flex flex-col gap-[24px] w-full">
        {Array.from({ length: groups }).map((_, i) => (
          <li key={i} className="flex flex-col gap-[12px]">
            <div className="flex items-center gap-[10px]">
              <Skeleton className="w-[28px] h-[28px] rounded-full shrink-0" />
              <Skeleton className="h-[14px] w-[140px]" />
            </div>
            <ul className="flex gap-[5px] w-full">
              {Array.from({ length: 5 }).map((_, j) => (
                <li
                  key={j}
                  className="basis-[calc((100%-20px)/5)] aspect-square shrink-0"
                >
                  <Skeleton className="w-full h-full rounded-[2px]" />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  );
}

// Mirrors ArtForm: scrim + centered card with a header bar, photo grid
// placeholder, three text-row clusters, and a submit button.
export function ArtFormSkeleton() {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center px-[16px] py-[24px] tab:py-[60px] desk:py-[67px]">
        <div className="bg-surface rounded-[16px] shadow-modal w-full max-w-[358px] tab:max-w-[440px] desk:max-w-[580px] p-[32px] flex flex-col gap-[16px]">
          <Skeleton className="h-[24px] w-[120px]" />
          <Skeleton className="h-[16px] w-[260px]" />
          <ul className="flex flex-wrap gap-[8px] mt-[8px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="basis-[calc((100%-16px)/3)] aspect-square shrink-0"
              >
                <Skeleton className="w-full h-full rounded-[8px]" />
              </li>
            ))}
          </ul>
          <Skeleton className="h-[44px] w-full rounded-[8px] mt-[8px]" />
          <Skeleton className="h-[44px] w-full rounded-[8px]" />
          <div className="flex gap-[8px]">
            <Skeleton className="h-[44px] flex-1 rounded-[8px]" />
            <Skeleton className="h-[44px] flex-1 rounded-[8px]" />
          </div>
          <Skeleton className="h-[88px] w-full rounded-[8px]" />
          <Skeleton className="h-[48px] w-full rounded-[8px] mt-[8px]" />
        </div>
      </div>
    </div>
  );
}
