import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { BookingView } from '@voyago/shared';
import { PaymentSimulator } from '@/components/checkout/PaymentSimulator';
import { PriceSummary } from '@/components/checkout/PriceSummary';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiFetchOrNull } from '@/lib/api';
import { getCurrentUser, loginPathFor } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Demo payment' };

export default async function PaymentPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(loginPathFor(`/checkout/payment/${reference}`));

  const booking = await apiFetchOrNull<BookingView>(`/bookings/${reference}`);
  if (!booking) {
    return (
      <div className="vg-container py-12">
        <EmptyState
          title="Booking not found"
          description="We could not find a booking with that reference under your account."
          icon="🔍"
          action={<ButtonLink href="/bookings">View my bookings</ButtonLink>}
        />
      </div>
    );
  }

  // Once a booking leaves the payable states there is nothing to pay here.
  if (!['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(booking.status)) {
    redirect(`/bookings/${booking.reference}`);
  }

  return (
    <div className="vg-container py-8">
      <nav aria-label="Checkout progress" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          <li className="font-semibold text-ink-faint">1. Choose a room</li>
          <li aria-hidden className="text-ink-faint">
            →
          </li>
          <li className="font-semibold text-ink-faint">2. Guest details</li>
          <li aria-hidden className="text-ink-faint">
            →
          </li>
          <li aria-current="step" className="font-semibold text-brand-700">
            3. Demo payment
          </li>
        </ol>
      </nav>

      <h1 className="font-display text-3xl font-bold text-ink">Confirm and pay</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Booking reference{' '}
        <span className="font-semibold text-ink" data-testid="booking-reference">
          {booking.reference}
        </span>{' '}
        is held until{' '}
        {booking.paymentDeadline
          ? new Date(booking.paymentDeadline).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'shortly'}
        .
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <section className="vg-card mb-5 p-5">
            <h2 className="font-display text-base font-bold text-ink">Guests</h2>
            <ul className="mt-2.5 space-y-1 text-sm text-ink-soft">
              {booking.guests.map((guest, index) => (
                <li key={`${guest.firstName}-${index}`}>
                  {guest.firstName} {guest.lastName}
                  {guest.isLeadGuest ? (
                    <span className="ml-2 text-xs text-ink-faint">Lead guest</span>
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
            {booking.specialRequests ? (
              <div className="mt-4 border-t border-sand-200 pt-4">
                <p className="text-xs text-ink-muted">Special requests</p>
                <p className="mt-0.5 text-sm text-ink-soft">{booking.specialRequests}</p>
              </div>
            ) : null}
          </section>

          <PaymentSimulator
            reference={booking.reference}
            amountMinor={booking.totalMinor}
            canRetry={booking.status === 'PAYMENT_FAILED'}
          />
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <PriceSummary
            hotelName={booking.hotel.name}
            starRating={booking.hotel.starRating}
            addressLine={booking.hotel.addressLine}
            city={booking.hotel.city}
            imageUrl={booking.hotel.imageUrl}
            roomName={booking.roomName}
            ratePlanName={booking.ratePlanName}
            checkIn={booking.checkIn}
            checkOut={booking.checkOut}
            nights={booking.nights}
            rooms={booking.rooms}
            adults={booking.adults}
            childCount={booking.children}
            price={booking.priceSnapshot}
          />
        </aside>
      </div>
    </div>
  );
}
