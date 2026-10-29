import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  formatDisplayDate,
  formatMoney,
  type BookingView,
  type FlightBookingView,
} from '@voyago/shared';
import { BookingTimeline } from '@/components/booking/BookingTimeline';
import { CancelBookingForm } from '@/components/booking/CancelBookingForm';
import { ResolvePendingForm } from '@/components/booking/ResolvePendingForm';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StarRating } from '@/components/ui/Rating';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FlightBookingDetail } from '@/components/booking/FlightBookingDetail';
import { apiFetchOrNull } from '@/lib/api';
import { productOf } from '@/lib/booking-product';
import { getCurrentUser, loginPathFor } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Free hosting suspends an idle API, so the first render after a quiet period
// waits while it wakes. Vercel's default function limit is well under that.
export const maxDuration = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Booking ${reference.toUpperCase()}` };
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ justPaid?: string; cancelled?: string; cancelError?: string }>;
}) {
  const { reference } = await params;
  const { justPaid, cancelled, cancelError } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect(loginPathFor(`/bookings/${reference}`));

  if (productOf(reference) === 'flight') {
    const flightBooking = await apiFetchOrNull<FlightBookingView>(`/flight-bookings/${reference}`);
    if (flightBooking) {
      return (
        <FlightBookingDetail
          booking={flightBooking}
          justPaid={justPaid}
          cancelled={cancelled}
          cancelError={cancelError}
        />
      );
    }
    // Falls through to the shared not-found state below.
  }

  const booking =
    productOf(reference) === 'flight'
      ? null
      : await apiFetchOrNull<BookingView>(`/bookings/${reference}`);
  if (!booking) {
    return (
      <div className="vg-container py-12">
        <EmptyState
          title="Booking not found"
          description="We could not find a booking with that reference under your account. If someone shared a reference with you, only the account that made the booking can view it."
          icon="🔒"
          action={<ButtonLink href="/bookings">View my bookings</ButtonLink>}
        />
      </div>
    );
  }

  const isPending = booking.paymentStatus === 'PENDING' && booking.status === 'PAYMENT_PROCESSING';
  const canPay = ['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(booking.status);

  return (
    <div className="vg-container py-8">
      {justPaid === '1' && booking.status === 'CONFIRMED' ? (
        <Alert tone="success" title="Your booking is confirmed" className="mb-6">
          A confirmation has been generated for reference <strong>{booking.reference}</strong>. This
          is a demo booking — the property has not been contacted and no money was charged.
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
          follows the rate&apos;s cancellation policy — simulated, as no real money ever moved.
        </Alert>
      ) : null}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={booking.status} />
            <Badge tone={booking.paymentStatus === 'SUCCEEDED' ? 'success' : 'neutral'}>
              Payment: {booking.paymentStatus.toLowerCase()}
            </Badge>
            {booking.refundStatus !== 'NOT_APPLICABLE' ? (
              <Badge tone={booking.refundStatus === 'REFUNDED' ? 'success' : 'neutral'}>
                Refund: {booking.refundStatus.toLowerCase()}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">{booking.hotel.name}</h1>
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
              View voucher
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
              Your room is still held until the payment window closes. You can retry the payment
              from this page.
            </Alert>
          ) : null}

          <section className="vg-card overflow-hidden">
            {booking.hotel.imageUrl ? (
              <div className="relative h-48 w-full">
                <Image
                  src={booking.hotel.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 700px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="p-5">
              <StarRating value={booking.hotel.starRating} />
              <h2 className="mt-1.5 font-display text-xl font-bold text-ink">
                {booking.hotel.name}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {booking.hotel.addressLine}, {booking.hotel.locality}, {booking.hotel.city},{' '}
                {booking.hotel.state}
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">Reception: {booking.hotel.phone}</p>

              <dl className="mt-5 grid gap-4 border-t border-sand-200 pt-5 sm:grid-cols-2">
                <div>
                  <dt className="vg-label">Check-in</dt>
                  <dd className="mt-1 font-semibold text-ink">
                    {formatDisplayDate(booking.checkIn)}
                  </dd>
                  <dd className="text-xs text-ink-muted">from {booking.hotel.checkInTime}</dd>
                </div>
                <div>
                  <dt className="vg-label">Check-out</dt>
                  <dd className="mt-1 font-semibold text-ink">
                    {formatDisplayDate(booking.checkOut)}
                  </dd>
                  <dd className="text-xs text-ink-muted">by {booking.hotel.checkOutTime}</dd>
                </div>
                <div>
                  <dt className="vg-label">Room</dt>
                  <dd className="mt-1 font-semibold text-ink">{booking.roomName}</dd>
                  <dd className="text-xs text-ink-muted">{booking.ratePlanName}</dd>
                </div>
                <div>
                  <dt className="vg-label">Stay</dt>
                  <dd className="mt-1 font-semibold text-ink">
                    {booking.nights} night{booking.nights > 1 ? 's' : ''}, {booking.rooms} room
                    {booking.rooms > 1 ? 's' : ''}
                  </dd>
                  <dd className="text-xs text-ink-muted">
                    {booking.adults} adult{booking.adults > 1 ? 's' : ''}
                    {booking.children > 0 ? `, ${booking.children} children` : ''}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="vg-card p-5">
            <h2 className="font-display text-base font-bold text-ink">Guests and contact</h2>
            <ul className="mt-3 space-y-1 text-sm text-ink-soft">
              {booking.guests.map((guest, index) => (
                <li key={`${guest.firstName}-${index}`}>
                  {guest.firstName} {guest.lastName}
                  {guest.isLeadGuest ? (
                    <span className="ml-2 text-xs text-ink-muted">Lead guest</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <dl className="mt-4 grid gap-3 border-t border-sand-200 pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-muted">Email</dt>
                <dd className="font-medium text-ink">{booking.contact.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Phone</dt>
                <dd className="font-medium text-ink">{booking.contact.phone}</dd>
              </div>
            </dl>
            {booking.specialRequests ? (
              <div className="mt-4 border-t border-sand-200 pt-4">
                <p className="text-xs text-ink-muted">Special requests</p>
                <p className="mt-0.5 text-sm text-ink-soft">{booking.specialRequests}</p>
              </div>
            ) : null}
          </section>

          <section className="vg-card p-5">
            <h2 className="font-display text-base font-bold text-ink">Cancellation policy</h2>
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
                This booking was cancelled. The refund outcome above follows the cancellation policy
                you booked under.
              </p>
              <ButtonLink href="/" variant="secondary" fullWidth className="mt-4">
                Book another stay
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
