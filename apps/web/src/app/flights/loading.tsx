import { Skeleton } from '@/components/ui/Skeleton';

/** Placeholder for the flight results while availability is computed. */
export default function Loading() {
  return (
    <div className="vg-container py-6 sm:py-8" role="status" aria-label="Searching flights">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-8 w-64" />
      <div className="mt-5 space-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
