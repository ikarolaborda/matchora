import { MatchCardSkeleton, TableSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="flex flex-col gap-lg">
      <MatchCardSkeleton />
      <TableSkeleton />
    </div>
  );
}
