'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { HOTEL_SORT_OPTIONS, type HotelSortOption } from '@voyago/shared';

const LABELS: Record<HotelSortOption, string> = {
  relevance: 'Recommended',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  rating_desc: 'Guest rating',
};

export function SortSelect({ value }: { value: HotelSortOption }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="whitespace-nowrap text-ink-muted">Sort by</span>
      <select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          if (event.target.value === 'relevance') params.delete('sort');
          else params.set('sort', event.target.value);
          params.delete('page');
          startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
        }}
        className="rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-sm font-medium text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        data-testid="sort-select"
        aria-label="Sort results"
      >
        {HOTEL_SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
