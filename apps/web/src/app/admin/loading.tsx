import { Skeleton } from '@/components/ui/Skeleton';

/** Placeholder for admin views while live figures load. */
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading admin data">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}
