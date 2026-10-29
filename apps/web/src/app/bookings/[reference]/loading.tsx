import { Skeleton } from '@/components/ui/Skeleton';

/** Placeholder matching the booking detail layout. */
export default function Loading() {
  return (
    <div className="vg-container max-w-4xl py-8" role="status" aria-label="Loading booking">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  );
}
