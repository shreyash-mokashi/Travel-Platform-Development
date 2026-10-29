import { ButtonLink } from '../ui/Button';

/**
 * Shown in place of the flight search form when the airport catalogue could
 * not be loaded. The hotel side of the site is unaffected, so this states the
 * limit plainly and keeps the working route one click away.
 */
export function FlightSearchUnavailable({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="status"
      data-testid="flight-search-unavailable"
      className={compact ? 'vg-card p-4' : 'rounded-2xl bg-white p-4 shadow-lift sm:p-5'}
    >
      <h2 className="font-display text-base font-bold text-ink">
        Flight search is temporarily unavailable
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        We could not load the airport list just now. Hotel search is working normally, and flights
        should be back shortly.
      </p>
      <div className="mt-3">
        <ButtonLink href="/hotels" variant="secondary">
          Search hotels instead
        </ButtonLink>
      </div>
    </div>
  );
}
