import { Skeleton } from '@/components/ui/Skeleton';

/** Placeholder while the fare is re-read and re-priced server-side. */
export default function Loading() {
  return (
    <div className="vg-container py-8" role="status" aria-label="Preparing your checkout">
      <Skeleton className="h-5 w-72" />
      <Skeleton className="mt-3 h-9 w-64" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <Skeleton className="h-[460px] w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    </div>
  );
}
