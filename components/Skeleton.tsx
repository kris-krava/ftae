interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse bg-divider/40 rounded-[6px] ${className ?? ''}`} />;
}

export function ArtworkGridSkeleton({ tiles = 8 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-2 tab:grid-cols-3 desk:grid-cols-5 gap-[4px] w-full">
      {Array.from({ length: tiles }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-[2px]" />
      ))}
    </div>
  );
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
