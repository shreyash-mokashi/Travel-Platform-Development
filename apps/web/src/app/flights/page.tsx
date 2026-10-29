import type { Metadata } from 'next';
import {
  FLIGHT_SORT_OPTIONS,
  addDays,
  formatDisplayDate,
  todayIso,
  type AirportView,
  type FlightSearchResponse,
  type FlightSortOption,
} from '@voyago/shared';
import { FlightOfferCard } from '@/components/flights/FlightOfferCard';
import { FlightSearchUnavailable } from '@/components/flights/FlightSearchUnavailable';
import { FlightSearchWidget } from '@/components/flights/FlightSearchWidget';
import { FlightSortSelect } from '@/components/flights/FlightSortSelect';
import { Alert } from '@/components/ui/Alert';
import { ButtonLink } from '@/components/ui/Button';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiFetch, apiFetchOrFallback } from '@/lib/api';
import { ApiError, toUserMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

// Free hosting suspends an idle API, so the first render after a quiet period
// waits while it wakes. Vercel's default function limit is well under that.
export const maxDuration = 60;

/** Matches the default departure date offered by the search form. */
const DEFAULT_DEPARTURE_OFFSET_DAYS = 14;

interface RawFlightParams {
  from?: string;
  to?: string;
  date?: string;
  adults?: string;
  children?: string;
  sort?: string;
}

function parseParams(raw: RawFlightParams) {
  const sort = FLIGHT_SORT_OPTIONS.includes(raw.sort as FlightSortOption)
    ? (raw.sort as FlightSortOption)
    : 'departure_asc';
  return {
    from: (raw.from ?? 'BOM').toUpperCase().slice(0, 3),
    to: (raw.to ?? 'GOI').toUpperCase().slice(0, 3),
    // Arriving with no date (the header link, a shared /flights URL) used to
    // send an empty string to the API and render a validation error. Fall back
    // to the same date the search form defaults to so the page lands on results.
    date: raw.date || addDays(todayIso(), DEFAULT_DEPARTURE_OFFSET_DAYS),
    adults: Math.max(1, Number(raw.adults) || 1),
    children: Math.max(0, Number(raw.children) || 0),
    sort,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawFlightParams>;
}): Promise<Metadata> {
  const params = parseParams(await searchParams);
  return {
    title: `Flights ${params.from} → ${params.to}`,
    description: `Demo flight availability from ${params.from} to ${params.to} on ${params.date}.`,
  };
}

export default async function FlightsPage({
  searchParams,
}: {
  searchParams: Promise<RawFlightParams>;
}) {
  const params = parseParams(await searchParams);

  // Losing the airport list must not blank the page: the search form degrades
  // and the error below explains why no results are shown.
  const airports = await apiFetchOrFallback<AirportView[]>('/flights/airports', []);

  let results: FlightSearchResponse | null = null;
  let searchError: string | null = null;
  try {
    const query = new URLSearchParams({
      from: params.from,
      to: params.to,
      date: params.date,
      adults: String(params.adults),
      children: String(params.children),
      sort: params.sort,
    });
    results = await apiFetch<FlightSearchResponse>(`/flights/search?${query.toString()}`);
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) {
      searchError = toUserMessage(error, 'That search is not valid. Adjust it and try again.');
    } else {
      // A server-side failure used to throw here. Because the layout shell has
      // already streamed by this point the error boundary could not replace it,
      // so the visitor was left with an empty page. Report it in place instead.
      searchError =
        'Flight availability could not be loaded right now. Please try again in a moment.';
    }
  }

  return (
    <div className="vg-container py-6 sm:py-8">
      {airports.length > 0 ? (
        <FlightSearchWidget
          airports={airports}
          defaults={{
            from: params.from,
            to: params.to,
            date: params.date,
            adults: params.adults,
            children: params.children,
          }}
          compact
        />
      ) : (
        <FlightSearchUnavailable compact />
      )}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {results
              ? `${results.origin.city} → ${results.destination.city}`
              : `${params.from} → ${params.to}`}
          </h1>
          {results ? (
            <p className="mt-1 text-sm text-ink-muted" data-testid="flight-search-summary">
              {formatDisplayDate(results.date)} · {results.adults} adult
              {results.adults > 1 ? 's' : ''}
              {results.children > 0
                ? ` · ${results.children} child${results.children > 1 ? 'ren' : ''}`
                : ''}{' '}
              · {results.total} flight{results.total === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
        {results && results.total > 1 ? <FlightSortSelect value={params.sort} /> : null}
      </div>

      <DemoNotice className="mt-3">
        Demo flights — every airline is fictional and all availability is seeded sample data.
      </DemoNotice>

      <div className="mt-5 space-y-4">
        {searchError ? (
          <Alert tone="error" title="We could not run that search">
            {searchError}
          </Alert>
        ) : null}

        {results && results.total === 0 ? (
          <EmptyState
            title="No flights on this day"
            description="The demo network does not operate this route on the chosen date. Try a nearby date, or the reverse direction."
            icon="🛫"
            action={<ButtonLink href="/flights">Reset search</ButtonLink>}
          />
        ) : null}

        {results?.items.map((offer) => (
          <FlightOfferCard
            key={`${offer.segment.flightId}-${offer.segment.date}`}
            offer={offer}
            adults={results.adults}
            childCount={results.children}
          />
        ))}
      </div>
    </div>
  );
}
