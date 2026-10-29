'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import {
  MEAL_PLAN_LABEL,
  formatMoney,
  type HotelSearchFacets,
  type MealPlan,
} from '@voyago/shared';
import { Button } from '../ui/Button';

/**
 * Filters write straight to the URL, so results stay shareable and the browser
 * back button steps through filter changes as the user expects.
 */
export function SearchFilters({
  facets,
  resultCount,
}: {
  facets: HotelSearchFacets;
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  // The checkbox must flip the instant it is clicked, not when the server has
  // re-rendered the results. Optimistic state does that and reverts by itself
  // if the navigation does not land.
  const [optimisticQuery, setOptimisticQuery] = useOptimistic(searchParams.toString());
  const active = new URLSearchParams(optimisticQuery);

  // Mutations are built from this ref rather than from the optimistic value,
  // which can still be mid-transition. It tracks the last query we intended,
  // and re-syncs to the URL whenever the server catches up - so two quick
  // clicks both land, and a settled page always edits the real query.
  const intendedQuery = useRef(searchParams.toString());
  useEffect(() => {
    intendedQuery.current = searchParams.toString();
  }, [searchParams]);

  const current = useCallback(
    (key: string): string[] => {
      const raw = new URLSearchParams(optimisticQuery).get(key);
      return raw ? raw.split(',').filter(Boolean) : [];
    },
    [optimisticQuery],
  );

  const apply = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(intendedQuery.current);
      mutate(params);
      // Any filter change resets to the first page of results.
      params.delete('page');

      const next = params.toString();
      intendedQuery.current = next;
      startTransition(() => {
        setOptimisticQuery(next);
        router.push(`${pathname}?${next}`, { scroll: false });
      });
    },
    [pathname, router, setOptimisticQuery],
  );

  const toggleMulti = (key: string, value: string) => {
    apply((params) => {
      const values = new Set(current(key));
      if (values.has(value)) values.delete(value);
      else values.add(value);
      if (values.size > 0) params.set(key, [...values].join(','));
      else params.delete(key);
    });
  };

  const setMaxPrice = (value: number) => {
    apply((params) => {
      if (facets.priceMaxMinor !== null && value >= facets.priceMaxMinor) {
        params.delete('maxPriceMinor');
      } else {
        params.set('maxPriceMinor', String(value));
      }
    });
  };

  const clearAll = () => {
    apply((params) => {
      for (const key of [
        'starRatings',
        'amenities',
        'mealPlans',
        'freeCancellation',
        'minPriceMinor',
        'maxPriceMinor',
      ]) {
        params.delete(key);
      }
    });
  };

  const activeCount =
    current('starRatings').length +
    current('amenities').length +
    current('mealPlans').length +
    (active.get('freeCancellation') === 'true' ? 1 : 0) +
    (active.get('maxPriceMinor') ? 1 : 0);

  const maxPrice = Number(active.get('maxPriceMinor')) || facets.priceMaxMinor || 0;

  const panel = (
    <div
      className={`space-y-6 transition-opacity ${pending ? 'opacity-70' : ''}`}
      data-testid="search-filters"
      aria-busy={pending}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-ink">
          Filters {activeCount > 0 ? <span className="text-brand-600">({activeCount})</span> : null}
        </h2>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-brand-700 hover:underline"
            data-testid="clear-filters"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {facets.priceMinMinor !== null &&
      facets.priceMaxMinor !== null &&
      facets.priceMaxMinor > facets.priceMinMinor ? (
        <fieldset>
          <legend className="vg-label mb-2">Total price for the stay</legend>
          <input
            type="range"
            min={facets.priceMinMinor}
            max={facets.priceMaxMinor}
            step={Math.max(1, Math.round((facets.priceMaxMinor - facets.priceMinMinor) / 40))}
            value={maxPrice}
            onChange={(event) => setMaxPrice(Number(event.target.value))}
            className="w-full accent-brand-600"
            id="filter-max-price"
            name="filter-max-price"
            aria-label="Maximum total price"
            data-testid="price-slider"
          />
          <div className="mt-1 flex justify-between text-xs text-ink-muted">
            <span>{formatMoney(facets.priceMinMinor)}</span>
            <span className="font-semibold text-ink">up to {formatMoney(maxPrice)}</span>
          </div>
        </fieldset>
      ) : null}

      {facets.starRatings.length > 0 ? (
        <fieldset>
          <legend className="vg-label mb-2">Star rating</legend>
          <div className="space-y-1.5">
            {facets.starRatings.map((entry) => (
              <label key={entry.value} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  id={`filter-star-${entry.value}`}
                  name={`filter-star-${entry.value}`}
                  checked={current('starRatings').includes(String(entry.value))}
                  onChange={() => toggleMulti('starRatings', String(entry.value))}
                  className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
                  data-testid={`filter-star-${entry.value}`}
                />
                <span className="flex-1 text-ink-soft">{entry.value} star</span>
                <span aria-hidden="true" className="text-xs text-ink-muted">
                  {entry.count}
                </span>
                <span className="sr-only">{entry.count} properties</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="vg-label mb-2">Cancellation</legend>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            id="filter-free-cancellation"
            name="filter-free-cancellation"
            checked={active.get('freeCancellation') === 'true'}
            onChange={() =>
              apply((params) => {
                if (params.get('freeCancellation') === 'true') params.delete('freeCancellation');
                else params.set('freeCancellation', 'true');
              })
            }
            className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
            data-testid="filter-free-cancellation"
          />
          <span className="flex-1 text-ink-soft">Free cancellation available</span>
          <span aria-hidden="true" className="text-xs text-ink-muted">
            {facets.freeCancellationCount}
          </span>
          <span className="sr-only">{facets.freeCancellationCount} properties</span>
        </label>
      </fieldset>

      {facets.mealPlans.length > 0 ? (
        <fieldset>
          <legend className="vg-label mb-2">Meals</legend>
          <div className="space-y-1.5">
            {facets.mealPlans.map((entry) => (
              <label key={entry.value} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  id={`filter-meal-${entry.value}`}
                  name={`filter-meal-${entry.value}`}
                  checked={current('mealPlans').includes(entry.value)}
                  onChange={() => toggleMulti('mealPlans', entry.value)}
                  className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
                  data-testid={`filter-meal-${entry.value}`}
                />
                <span className="flex-1 text-ink-soft">
                  {MEAL_PLAN_LABEL[entry.value as MealPlan]}
                </span>
                <span aria-hidden="true" className="text-xs text-ink-muted">
                  {entry.count}
                </span>
                <span className="sr-only">{entry.count} properties</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {facets.amenities.length > 0 ? (
        <fieldset>
          <legend className="vg-label mb-2">Amenities</legend>
          <div className="space-y-1.5">
            {facets.amenities.slice(0, 10).map((entry) => (
              <label key={entry.code} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  id={`filter-amenity-${entry.code}`}
                  name={`filter-amenity-${entry.code}`}
                  checked={current('amenities').includes(entry.code)}
                  onChange={() => toggleMulti('amenities', entry.code)}
                  className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
                  data-testid={`filter-amenity-${entry.code}`}
                />
                <span className="flex-1 text-ink-soft">{entry.label}</span>
                <span aria-hidden="true" className="text-xs text-ink-muted">
                  {entry.count}
                </span>
                <span className="sr-only">{entry.count} properties</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          data-testid="toggle-filters"
        >
          {mobileOpen ? 'Hide filters' : `Filters${activeCount > 0 ? ` (${activeCount})` : ''}`}
        </Button>
        {mobileOpen ? (
          <div className="vg-card mt-3 p-4" data-testid="filters-mobile">
            {panel}
          </div>
        ) : null}
      </div>

      <aside className="sticky top-20 hidden self-start lg:block" data-testid="filters-desktop">
        <div className="vg-card p-5">
          {panel}
          <p className="mt-6 border-t border-sand-200 pt-3 text-xs text-ink-muted">
            {resultCount} propert{resultCount === 1 ? 'y' : 'ies'} match your filters.
          </p>
        </div>
      </aside>
    </>
  );
}
