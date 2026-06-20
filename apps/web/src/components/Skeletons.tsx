export function MatchCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-lg border border-border bg-surface p-md"
      aria-hidden="true"
    >
      <div className="mb-sm h-4 w-20 rounded-pill bg-surface-raised" />
      <div className="flex items-center justify-between gap-md">
        <div className="flex flex-1 flex-col gap-sm">
          <div className="h-5 w-3/4 rounded bg-surface-raised" />
          <div className="h-5 w-2/3 rounded bg-surface-raised" />
        </div>
        <div className="h-8 w-12 rounded bg-surface-raised" />
      </div>
    </div>
  );
}

export function MatchListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-md" role="status" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div
      className="animate-pulse rounded-lg border border-border bg-surface p-md"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mb-sm h-6 w-full rounded bg-surface-raised" />
      ))}
    </div>
  );
}
