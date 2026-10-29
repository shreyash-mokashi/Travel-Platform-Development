import { Skeleton } from '@/components/ui/Skeleton';

/** Placeholder for the account page. */
export default function Loading() {
  return (
    <div className="vg-container max-w-2xl py-8" role="status" aria-label="Loading account">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <Skeleton className="mt-8 h-96 w-full rounded-2xl" />
    </div>
  );
}
