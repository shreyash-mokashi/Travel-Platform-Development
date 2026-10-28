import { cn } from './cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('vg-skeleton', className)} aria-hidden />;
}

/** Placeholder matching the shape of a hotel result card. */
export function HotelCardSkeleton() {
  return (
    <div className="vg-card flex flex-col gap-4 p-4 sm:flex-row" data-testid="hotel-card-skeleton">
      <Skeleton className="h-48 w-full shrink-0 rounded-xl sm:h-40 sm:w-60" />
      <div className="flex-1 space-y-3 py-1">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3.5 w-3/4" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      <div className="flex w-full flex-col items-end justify-end gap-2 sm:w-44">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function HotelListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading hotels">
      {Array.from({ length: count }, (_, index) => (
        <HotelCardSkeleton key={index} />
      ))}
    </div>
  );
}
