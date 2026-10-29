import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { formatDisplayDate, type Destination, type HotelSearchResponse } from '@voyago/shared';
import { HotelCard } from '@/components/hotels/HotelCard';
import { Pagination } from '@/components/hotels/Pagination';
import { SearchFilters } from '@/components/hotels/SearchFilters';
import { SortSelect } from '@/components/hotels/SortSelect';
import { SearchWidget } from '@/components/search/SearchWidget';
import { Alert } from '@/components/ui/Alert';
import { ButtonLink } from '@/components/ui/Button';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { EmptyState } from '@/components/ui/EmptyState';
import { HotelListSkeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import {
  buildSearchQuery,
  parseSearchParams,
  stayQuery,
  type RawSearchParams,
} from '@/lib/search-params';

export const dynamic = 'force-dynamic';

// Free hosting suspends an idle API, so the first render after a quiet period
// waits while it wakes. Vercel's default function limit is well under that.
export const maxDuration = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const search = parseSearchParams(await searchParams);
  const city = search.destination
    ? search.destination.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : '';
  const where = city ? ` in ${city}` : '';
  return {
    title: `Hotels${where}`,
    description: `Demo hotel availability${where} from ${search.checkIn} to ${search.checkOut}.`,
  };
}

export default async function HotelSearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const search = parseSearchParams(raw);
  const destinations = await apiFetch<Destination[]>('/destinations', { auth: false });

  return (
    <div className="vg-container py-6 sm:py-8">
      <SearchWidget
        destinations={destinations}
        defaults={{
          destination: search.destination,
          checkIn: search.checkIn,
          checkOut: search.checkOut,
          rooms: search.rooms,
          adults: search.adults,
          children: search.children,
        }}
        variant="compact"
      />

      {!search.destination ? (
        <div className="mt-6">
          <EmptyState
            title="Where would you like to stay?"
            description="Choose a destination above to see demo hotel availability for your dates."
            icon="🔎"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {destinations.slice(0, 4).map((destination) => (
                  <ButtonLink
                    key={destination.id}
                    href={`/hotels?destination=${destination.slug}&${stayQuery(search)}`}
                    variant="secondary"
                    size="sm"
                  >
                    {destination.city}
                  </ButtonLink>
                ))}
              </div>
            }
          />
        </div>
      ) : (
        <Suspense key={JSON.stringify(raw)} fallback={<SearchSkeleton />}>
          <Results search={search} />
        </Suspense>
      )}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="vg-skeleton hidden h-[480px] lg:block" />
      <HotelListSkeleton />
    </div>
  );
}

async function Results({ search }: { search: ReturnType<typeof parseSearchParams> }) {
  let data: HotelSearchResponse;
  try {
    data = await apiFetch<HotelSearchResponse>(`/hotels/search?${buildSearchQuery(search)}`, {
      auth: false,
    });
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'We could not load availability right now. Please try again.';
    return (
      <div className="mt-6">
        <Alert tone="error" title="Search could not be completed">
          {message}
        </Alert>
        <div className="mt-4">
          <EmptyState
            title="No results to show"
            description="Adjust your dates or destination and search again."
            icon="⚠️"
            action={<ButtonLink href="/">Start a new search</ButtonLink>}
          />
        </div>
      </div>
    );
  }

  const stay = stayQuery(search);
  const hrefForPage = (page: number) => `/hotels?${buildSearchQuery({ ...search, page })}`;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {data.destination.city} hotels
          </h1>
          <p className="mt-1 text-sm text-ink-muted" data-testid="search-summary">
            {formatDisplayDate(data.checkIn)} – {formatDisplayDate(data.checkOut)} · {data.nights}{' '}
            night{data.nights > 1 ? 's' : ''} · {data.rooms} room
            {data.rooms > 1 ? 's' : ''} · {data.adults} adult{data.adults > 1 ? 's' : ''}
            {data.children > 0 ? ` · ${data.children} child${data.children > 1 ? 'ren' : ''}` : ''}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink-soft" data-testid="result-count">
            {data.total} propert{data.total === 1 ? 'y' : 'ies'} available
          </p>
        </div>
        <SortSelect value={search.sort} />
      </div>

      <DemoNotice variant="banner" className="mt-4" />

      <div className="mt-5 grid gap-6 lg:grid-cols-[280px_1fr]">
        <SearchFilters facets={data.facets} resultCount={data.total} />

        <div className="space-y-4" data-testid="hotel-results">
          {data.items.length === 0 ? (
            <EmptyState
              title="No hotels match these filters"
              description="Try widening your price range, removing an amenity filter, or shifting your dates by a day or two."
              icon="🏨"
              action={
                <ButtonLink
                  href={`/hotels?destination=${search.destination}&${stay}`}
                  variant="secondary"
                >
                  Clear filters
                </ButtonLink>
              }
            />
          ) : (
            <>
              {data.items.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  stayQueryString={stay}
                  nights={data.nights}
                />
              ))}
              <Pagination page={data.page} totalPages={data.totalPages} buildHref={hrefForPage} />
              <p className="pt-2 text-center text-xs text-ink-muted">
                Showing page {data.page} of {data.totalPages}.{' '}
                <Link href="/destinations" className="font-semibold text-brand-700 hover:underline">
                  Browse other destinations
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
