import { Skeleton } from '@/components/ui/Skeleton';

/** Placeholder while the quote is re-read and re-priced server-side. */
export default function Loading() {
  return (
    <div className="vg-container max-w-5xl py-8" role="status" aria-label="Preparing your checkout">
      <Skeleton className="h-5 w-72" />
      <Skeleton className="mt-3 h-9 w-64" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-[480px] w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    </div>
  );
}
