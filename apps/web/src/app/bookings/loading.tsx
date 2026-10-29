import { Skeleton } from '@/components/ui/Skeleton';

/** Shape-matched placeholder for the bookings list while it loads. */
export default function Loading() {
  return (
    <div className="vg-container max-w-4xl py-8" role="status" aria-label="Loading your bookings">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-8 space-y-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="vg-card flex flex-col gap-4 p-5 sm:flex-row">
            <Skeleton className="h-28 w-full shrink-0 rounded-xl sm:w-44" />
            <div className="flex-1 space-y-3 py-1">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
            <Skeleton className="h-8 w-28 self-start rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
