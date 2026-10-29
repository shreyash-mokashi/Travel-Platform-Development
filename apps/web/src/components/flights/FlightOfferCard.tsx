'use client';

import { useActionState, useState } from 'react';
import { CABIN_LABEL, formatDuration, minuteToClock, type FlightOfferView } from '@voyago/shared';
import { createFlightQuoteAction } from '@/lib/actions';
import { emptyActionState } from '@/lib/action-state';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Price } from '../ui/Price';
import { cn } from '../ui/cn';

/**
 * One flight with its fare families. The cheapest fare is summarised on the
 * card; expanding shows every family with its rules, and selecting one posts
 * a server-side fare recheck before checkout.
 */
export function FlightOfferCard({
  offer,
  adults,
  childCount,
}: {
  offer: FlightOfferView;
  adults: number;
  /** Named childCount because `children` is reserved for React's own prop. */
  childCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, pending] = useActionState(createFlightQuoteAction, emptyActionState);
  const { segment } = offer;

  return (
    <article className="vg-card p-4 sm:p-5" data-testid="flight-offer">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {segment.airline.name} · {segment.flightNumber} · {segment.aircraft}
          </p>
          <div className="mt-2 flex items-center gap-3 sm:gap-5">
            <div>
              <p className="font-display text-2xl font-bold tabular-nums text-ink">
                {minuteToClock(segment.departureMinute)}
              </p>
              <p className="text-xs text-ink-muted">{segment.origin.iata}</p>
            </div>
            <div className="flex min-w-[72px] flex-col items-center text-ink-muted">
              <span className="text-xs">{formatDuration(segment.durationMinutes)}</span>
              <span aria-hidden className="w-full border-t border-dashed border-sand-400" />
              <span className="text-[11px]">Non-stop</span>
            </div>
            <div>
              <p className="font-display text-2xl font-bold tabular-nums text-ink">
                {minuteToClock(segment.arrivalMinute)}
                {segment.dayOffset > 0 ? (
                  <sup className="ml-0.5 text-xs font-semibold text-amber-600">
                    +{segment.dayOffset}
                  </sup>
                ) : null}
              </p>
              <p className="text-xs text-ink-muted">{segment.destination.iata}</p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-ink-muted">From, all travellers</p>
          <Price minor={offer.leadTotalMinor} className="font-display text-xl font-bold text-ink" />
          <p className="text-[11px] text-ink-muted">Incl. taxes &amp; fees</p>
          <Button
            variant={expanded ? 'secondary' : 'primary'}
            className="mt-2"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            data-testid="toggle-fares"
          >
            {expanded ? 'Hide fares' : 'View fares'}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-3 border-t border-sand-200 pt-4">
          {state.message ? <Alert tone="error">{state.message}</Alert> : null}
          {offer.fares.map((fare) => (
            <div
              key={fare.fareClassId}
              className={cn(
                'flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5',
                fare.cabin === 'BUSINESS' ? 'border-brand-300 bg-brand-50/50' : 'border-sand-200',
              )}
              data-testid={`fare-${fare.code}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{fare.name}</span>
                  <Badge tone="neutral">{CABIN_LABEL[fare.cabin]}</Badge>
                  {fare.refundable ? (
                    <Badge tone="success">Refundable</Badge>
                  ) : (
                    <Badge tone="neutral">Non-refundable</Badge>
                  )}
                  {fare.seatsLeft <= 4 ? (
                    <span className="text-xs font-semibold text-amber-700">
                      {fare.seatsLeft} seat{fare.seatsLeft === 1 ? '' : 's'} left
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {fare.checkinBaggageKg} kg check-in · {fare.cabinBaggageKg} kg cabin
                  {fare.mealIncluded ? ' · Meal included' : ''}
                  {fare.seatSelectionIncluded ? ' · Free seat selection' : ''}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">{fare.cancellationPolicy.name}</p>
              </div>

              <form action={formAction} className="flex items-center gap-3">
                <input type="hidden" name="flightId" value={segment.flightId} />
                <input type="hidden" name="fareClassId" value={fare.fareClassId} />
                <input type="hidden" name="date" value={segment.date} />
                <input type="hidden" name="adults" value={adults} />
                <input type="hidden" name="children" value={childCount} />
                <input type="hidden" name="expectedTotalMinor" value={fare.price.totalMinor} />
                <Price
                  minor={fare.price.totalMinor}
                  className="font-display text-lg font-bold text-ink"
                />
                <Button type="submit" disabled={pending} data-testid={`select-fare-${fare.code}`}>
                  {pending ? 'Holding…' : 'Select'}
                </Button>
              </form>
            </div>
          ))}
          <p className="text-xs text-ink-muted">
            Fares are seeded demo data from fictional airlines. Selecting a fare rechecks the price
            server-side and holds the seats for 20 minutes.
          </p>
        </div>
      ) : null}
    </article>
  );
}
