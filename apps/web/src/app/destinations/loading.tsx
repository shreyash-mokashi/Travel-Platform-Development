import { Skeleton } from '@/components/ui/Skeleton';

/** Placeholder for the destination gallery. */
export default function Loading() {
  return (
    <div className="vg-container py-8" role="status" aria-label="Loading destinations">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
