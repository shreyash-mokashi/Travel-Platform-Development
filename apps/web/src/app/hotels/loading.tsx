import { HotelListSkeleton, Skeleton } from '@/components/ui/Skeleton';

/**
 * Scoped to the search route. A root-level loading.tsx would wrap every page
 * in a Suspense boundary, which forces streaming and prevents notFound() from
 * setting a real 404 status.
 */
export default function Loading() {
  return (
    <div className="vg-container py-6 sm:py-8">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Skeleton className="hidden h-[480px] lg:block" />
        <HotelListSkeleton />
      </div>
    </div>
  );
}
