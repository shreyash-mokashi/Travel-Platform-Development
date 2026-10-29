'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { FLIGHT_SORT_OPTIONS, type FlightSortOption } from '@voyago/shared';

const LABELS: Record<FlightSortOption, string> = {
  departure_asc: 'Departure time',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  duration_asc: 'Duration',
};

export function FlightSortSelect({ value }: { value: FlightSortOption }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="whitespace-nowrap text-ink-muted">Sort by</span>
      <select
        id="flight-sort"
        name="flight-sort"
        value={value}
        disabled={pending}
        aria-label="Sort flights"
        className="vg-input w-auto py-1.5"
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('sort', event.target.value);
          startTransition(() => router.replace(`${pathname}?${params.toString()}`));
        }}
      >
        {FLIGHT_SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
