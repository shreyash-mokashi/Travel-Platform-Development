import Link from 'next/link';
import {
  CABIN_LABEL,
  formatDisplayDate,
  formatDuration,
  formatMoney,
  minuteToClock,
  type FlightBookingView,
} from '@voyago/shared';
import { PrintButton } from './PrintButton';
import { Logo } from '../Logo';

/** Printable demo e-ticket, the flight twin of the hotel voucher. */
export function FlightEticket({ booking }: { booking: FlightBookingView }) {
  const lead =
    booking.passengers.find((passenger) => passenger.isLeadPassenger) ?? booking.passengers[0];
  const { segment } = booking;

  return (
    <div className="vg-container max-w-3xl py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 vg-no-print">
        <Link
          href={`/bookings/${booking.reference}`}
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          ← Back to booking
        </Link>
        <PrintButton />
      </div>

      <article
        className="vg-card overflow-hidden print:border-0 print:shadow-none"
        data-testid="voucher"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-sand-200 bg-sand-100 p-6 print:bg-white">
          <div>
            <Logo />
            <p className="mt-2 text-xs text-ink-muted">Demo flight e-ticket</p>
          </div>
          <div className="text-right">
            <p className="vg-label">Booking reference</p>
            <p className="font-mono text-xl font-bold text-ink" data-testid="voucher-reference">
              {booking.reference}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
              {booking.status === 'CONFIRMED' ? 'Confirmed' : booking.status.replace(/_/g, ' ')}
            </p>
          </div>
        </header>

        <div className="space-y-6 p-6">
          <section>
            <h2 className="vg-label">Flight</h2>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {segment.airline.name} {segment.flightNumber}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-6">
              <div>
                <p className="font-display text-2xl font-bold tabular-nums text-ink">
                  {minuteToClock(segment.departureMinute)}
                </p>
                <p className="text-sm font-semibold text-ink">
                  {segment.origin.iata} · {segment.origin.city}
                </p>
                <p className="text-xs text-ink-muted">{segment.origin.name}</p>
              </div>
              <div className="text-center text-xs text-ink-muted">
                <p>{formatDuration(segment.durationMinutes)}</p>
                <p aria-hidden>———✈———</p>
                <p>Non-stop · {segment.aircraft}</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold tabular-nums text-ink">
                  {minuteToClock(segment.arrivalMinute)}
                  {segment.dayOffset > 0 ? (
                    <sup className="ml-0.5 text-xs">+{segment.dayOffset}</sup>
                  ) : null}
                </p>
                <p className="text-sm font-semibold text-ink">
                  {segment.destination.iata} · {segment.destination.city}
                </p>
                <p className="text-xs text-ink-muted">{segment.destination.name}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-5 border-t border-sand-200 pt-5 sm:grid-cols-2">
            <div>
              <h2 className="vg-label">Departure date</h2>
              <p className="mt-1 text-base font-semibold text-ink">
                {formatDisplayDate(booking.travelDate)}
              </p>
            </div>
            <div>
              <h2 className="vg-label">Fare</h2>
              <p className="mt-1 text-base font-semibold text-ink">
                {booking.fareName} · {CABIN_LABEL[booking.cabin]}
              </p>
            </div>
            <div>
              <h2 className="vg-label">Lead passenger</h2>
              <p className="mt-1 text-base font-semibold text-ink">
                {lead ? `${lead.firstName} ${lead.lastName}` : '—'}
              </p>
              <p className="text-xs text-ink-muted">{booking.contact.email}</p>
              <p className="text-xs text-ink-muted">{booking.contact.phone}</p>
            </div>
            <div>
              <h2 className="vg-label">Travellers</h2>
              <ul className="mt-1 text-sm font-medium text-ink">
                {booking.passengers.map((passenger, index) => (
                  <li key={`${passenger.firstName}-${index}`}>
                    {index + 1}. {passenger.firstName} {passenger.lastName}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="border-t border-sand-200 pt-5">
            <h2 className="vg-label">Amount</h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              {booking.priceSnapshot.lines.map((line) => (
                <div key={line.code} className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{line.label}</dt>
                  <dd className="tabular-nums text-ink-soft">{formatMoney(line.amountMinor)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-sand-300 pt-2">
                <dt className="font-display font-bold text-ink">Total</dt>
                <dd className="font-display font-bold tabular-nums text-ink">
                  {formatMoney(booking.totalMinor)}
                </dd>
              </div>
            </dl>
          </section>

          <p className="border-t border-sand-200 pt-4 text-xs leading-relaxed text-ink-muted">
            This e-ticket is generated by a portfolio demonstration. The airline is fictional, no
            seat is reserved, and no payment was collected. It is not valid for travel.
          </p>
        </div>
      </article>
    </div>
  );
}
