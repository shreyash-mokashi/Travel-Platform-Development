import Link from 'next/link';
import {
  CABIN_LABEL,
  formatDisplayDate,
  formatDuration,
  formatMoney,
  minuteToClock,
  type FlightBookingView,
} from '@voyago/shared';
import { BookingTimeline } from './BookingTimeline';
import { CancelBookingForm } from './CancelBookingForm';
import { ResolvePendingForm } from './ResolvePendingForm';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { ButtonLink } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';

/**
 * The flight variant of the booking detail screen. Shares the banners,
 * timeline, cancel and resolve-pending machinery with hotels; only the
 * product sections differ.
 */
export function FlightBookingDetail({
  booking,
  justPaid,
  cancelled,
  cancelError,
}: {
  booking: FlightBookingView;
  justPaid?: string;
  cancelled?: string;
  cancelError?: string;
}) {
  const isPending = booking.paymentStatus === 'PENDING' && booking.status === 'PAYMENT_PROCESSING';
  const canPay = ['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(booking.status);
  const { segment } = booking;

  return (
    <div className="vg-container py-8">
      {justPaid === '1' && booking.status === 'CONFIRMED' ? (
        <Alert tone="success" title="Your flight is booked" className="mb-6">
          A confirmation has been generated for reference <strong>{booking.reference}</strong>. This
          is a demo booking — no real seat is reserved and no money was charged.
        </Alert>
      ) : null}

      {cancelError ? (
        <Alert tone="error" title="The booking could not be cancelled" className="mb-6">
          {cancelError}
        </Alert>
      ) : null}

      {cancelled === '1' && booking.status === 'CANCELLED' ? (
        <Alert tone="success" title="Your cancellation has been processed" className="mb-6">
          Booking <strong>{booking.reference}</strong> is cancelled. The refund decision below
          follows the fare&apos;s cancellation rules — simulated, as no real money ever moved.
        </Alert>
      ) : null}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={booking.status} />
            <Badge tone="neutral">Payment: {booking.paymentStatus.toLowerCase()}</Badge>
            {booking.refundStatus !== 'NOT_APPLICABLE' ? (
              <Badge tone={booking.refundStatus === 'REFUNDED' ? 'success' : 'neutral'}>
                Refund: {booking.refundStatus.toLowerCase()}
              </Badge>
            ) : null}
            <Badge tone="neutral">✈️ Flight</Badge>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">
            {segment.origin.city} → {segment.destination.city}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Booking reference{' '}
            <span className="font-mono font-semibold text-ink" data-testid="booking-reference">
              {booking.reference}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 vg-no-print">
          {['CONFIRMED', 'CANCELLATION_REQUESTED'].includes(booking.status) ? (
            <ButtonLink href={`/bookings/${booking.reference}/voucher`} variant="secondary">
              View e-ticket
            </ButtonLink>
          ) : null}
          {canPay ? (
            <ButtonLink href={`/checkout/payment/${booking.reference}`}>
              {booking.status === 'PAYMENT_FAILED' ? 'Retry payment' : 'Complete payment'}
            </ButtonLink>
          ) : null}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {isPending ? <ResolvePendingForm reference={booking.reference} /> : null}

          {booking.status === 'PAYMENT_FAILED' ? (
            <Alert tone="error" title="The demo payment did not go through">
              Your seats are still held until the payment window closes. You can retry the payment
              from this page.
            </Alert>
          ) : null}

          <section className="vg-card p-5" data-testid="flight-segment">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {segment.airline.name} · {segment.flightNumber} · {segment.aircraft}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-5 sm:gap-8">
              <div>
                <p className="font-display text-3xl font-bold tabular-nums text-ink">
                  {minuteToClock(segment.departureMinute)}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{segment.origin.iata}</p>
                <p className="text-xs text-ink-muted">{segment.origin.name}</p>
              </div>
              <div className="flex min-w-[90px] flex-col items-center text-ink-muted">
                <span className="text-xs">{formatDuration(segment.durationMinutes)}</span>
                <span aria-hidden className="w-full border-t border-dashed border-sand-400" />
                <span className="text-[11px]">Non-stop</span>
              </div>
              <div>
                <p className="font-display text-3xl font-bold tabular-nums text-ink">
                  {minuteToClock(segment.arrivalMinute)}
                  {segment.dayOffset > 0 ? (
                    <sup className="ml-0.5 text-sm font-semibold text-amber-600">
                      +{segment.dayOffset}
                    </sup>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{segment.destination.iata}</p>
                <p className="text-xs text-ink-muted">{segment.destination.name}</p>
              </div>
            </div>
            <dl className="mt-5 grid gap-4 border-t border-sand-200 pt-5 sm:grid-cols-3">
              <div>
                <dt className="vg-label">Departure</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {formatDisplayDate(booking.travelDate)}
                </dd>
              </div>
              <div>
                <dt className="vg-label">Fare</dt>
                <dd className="mt-1 font-semibold text-ink">{booking.fareName}</dd>
                <dd className="text-xs text-ink-muted">{CABIN_LABEL[booking.cabin]}</dd>
              </div>
              <div>
                <dt className="vg-label">Travellers</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {booking.adults} adult{booking.adults > 1 ? 's' : ''}
                  {booking.children > 0
                    ? `, ${booking.children} child${booking.children > 1 ? 'ren' : ''}`
                    : ''}
                </dd>
              </div>
            </dl>
          </section>

          <section className="vg-card p-5">
            <h2 className="font-display text-base font-bold text-ink">Passengers</h2>
            <ul className="mt-2.5 space-y-1 text-sm text-ink-soft">
              {booking.passengers.map((passenger, index) => (
                <li key={`${passenger.firstName}-${index}`}>
                  {passenger.firstName} {passenger.lastName}
                  {passenger.isLeadPassenger ? (
                    <span className="ml-2 text-xs text-ink-muted">Lead passenger</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <dl className="mt-4 grid gap-2 border-t border-sand-200 pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-muted">Email</dt>
                <dd className="font-medium text-ink">{booking.contact.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Phone</dt>
                <dd className="font-medium text-ink">{booking.contact.phone}</dd>
              </div>
            </dl>
          </section>

          <section className="vg-card p-5">
            <h2 className="font-display text-base font-bold text-ink">Fare rules</h2>
            <p className="mt-2 text-sm font-semibold text-ink-soft">
              {booking.cancellationPolicy.name}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {booking.cancellationPolicy.description}
            </p>
            {booking.cancellationPolicy.tiers.length > 0 ? (
              <ul className="mt-2.5 list-inside list-disc space-y-1 text-xs text-ink-soft">
                {booking.cancellationPolicy.tiers.map((tier) => (
                  <li key={tier.hoursBeforeCheckIn}>{tier.label}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="vg-card p-5">
            <h2 className="font-display text-base font-bold text-ink">Booking history</h2>
            <div className="mt-4">
              <BookingTimeline events={booking.statusHistory} />
            </div>

            {booking.paymentAttempts.length > 0 ? (
              <div className="mt-5 border-t border-sand-200 pt-4">
                <h3 className="text-sm font-semibold text-ink">Demo payment attempts</h3>
                <ul className="mt-2.5 space-y-2">
                  {booking.paymentAttempts.map((attempt) => (
                    <li
                      key={attempt.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sand-100 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-ink-soft">
                        {attempt.scenario} · {attempt.status}
                        {attempt.failureReason ? ` — ${attempt.failureReason}` : ''}
                      </span>
                      <span className="tabular-nums text-ink-muted">
                        {formatMoney(attempt.amountMinor)} ·{' '}
                        {new Date(attempt.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="vg-card p-5">
            <h2 className="font-display text-base font-bold text-ink">Price breakdown</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {booking.priceSnapshot.lines.map((line) => (
                <div key={line.code} className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{line.label}</dt>
                  <dd
                    className={`text-right font-medium tabular-nums ${
                      line.amountMinor < 0 ? 'text-brand-700' : 'text-ink-soft'
                    }`}
                  >
                    {formatMoney(line.amountMinor)}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex items-baseline justify-between border-t-2 border-ink/10 pt-3">
              <span className="font-display font-bold text-ink">Total paid</span>
              <span
                className="font-display text-xl font-bold tabular-nums text-ink"
                data-testid="booking-total"
              >
                {formatMoney(booking.totalMinor)}
              </span>
            </div>
            {booking.refundMinor !== null ? (
              <div className="mt-2 flex items-baseline justify-between text-sm">
                <span className="font-medium text-brand-700">Simulated refund</span>
                <span
                  className="font-semibold tabular-nums text-brand-700"
                  data-testid="refund-amount"
                >
                  {formatMoney(booking.refundMinor)}
                </span>
              </div>
            ) : null}
            <p className="mt-3 text-xs text-ink-muted">
              This is a demo booking. No money was charged and no refund is actually issued.
            </p>
          </div>

          {booking.status === 'CONFIRMED' ? (
            <CancelBookingForm
              reference={booking.reference}
              preview={booking.cancellationPreview ?? null}
            />
          ) : null}

          {booking.status === 'CANCELLED' ? (
            <div className="vg-card p-5">
              <h2 className="font-display text-base font-bold text-ink">Cancelled</h2>
              <p className="mt-2 text-sm text-ink-soft">
                This booking was cancelled. The refund outcome above follows the fare rules you
                booked under.
              </p>
              <ButtonLink href="/flights" variant="secondary" fullWidth className="mt-4">
                Book another flight
              </ButtonLink>
            </div>
          ) : null}

          <p className="text-center text-xs text-ink-muted">
            <Link href="/bookings" className="font-semibold text-brand-700 hover:underline">
              ← All my bookings
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
