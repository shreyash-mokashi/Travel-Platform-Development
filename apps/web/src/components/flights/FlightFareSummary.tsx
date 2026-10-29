import {
  CABIN_LABEL,
  formatDisplayDate,
  formatDuration,
  formatMoney,
  minuteToClock,
  type FareOfferView,
  type FarePriceBreakdown,
  type FlightSegmentView,
} from '@voyago/shared';
import { Badge } from '../ui/Badge';

/**
 * The flight twin of PriceSummary: segment, fare family, and the exact price
 * lines the server computed. Server component - no interactivity.
 */
export function FlightFareSummary({
  segment,
  fareName,
  cabin,
  refundable,
  policyName,
  price,
  travellersLabel,
}: {
  segment: FlightSegmentView;
  fareName: string;
  cabin: FareOfferView['cabin'];
  refundable: boolean;
  policyName: string;
  price: FarePriceBreakdown;
  travellersLabel: string;
}) {
  return (
    <section className="vg-card overflow-hidden" data-testid="fare-summary">
      <div className="bg-ink px-5 py-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-sand-200">
          {segment.airline.name} · {segment.flightNumber}
        </p>
        <p className="mt-1 font-display text-lg font-bold">
          {segment.origin.city} → {segment.destination.city}
        </p>
        <p className="mt-0.5 text-sm text-sand-200">
          {formatDisplayDate(segment.date)} · {minuteToClock(segment.departureMinute)}–
          {minuteToClock(segment.arrivalMinute)}
          {segment.dayOffset > 0 ? ` (+${segment.dayOffset}d)` : ''} ·{' '}
          {formatDuration(segment.durationMinutes)}
        </p>
      </div>

      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{fareName}</span>
          <Badge tone="neutral">{CABIN_LABEL[cabin]}</Badge>
          {refundable ? <Badge tone="success">Refundable</Badge> : null}
        </div>
        <p className="text-xs text-ink-muted">{policyName}</p>
        <p className="text-xs text-ink-muted">{travellersLabel}</p>

        <dl className="space-y-1.5 border-t border-sand-200 pt-3 text-sm">
          {price.lines.map((line) => (
            <div key={line.code} className="flex justify-between gap-3">
              <dt className="text-ink-muted">{line.label}</dt>
              <dd className="font-medium tabular-nums text-ink-soft">
                {formatMoney(line.amountMinor)}
              </dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-sand-300 pt-2">
            <dt className="font-display font-bold text-ink">Total</dt>
            <dd
              className="font-display text-lg font-bold tabular-nums text-brand-700"
              data-testid="fare-total"
            >
              {formatMoney(price.totalMinor)}
            </dd>
          </div>
        </dl>
        <p className="text-[11px] text-ink-muted">
          Demo pricing on a fictional airline. No real seat is reserved.
        </p>
      </div>
    </section>
  );
}
