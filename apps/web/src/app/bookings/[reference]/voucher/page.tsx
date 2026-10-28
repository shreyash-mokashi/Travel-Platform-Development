import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatDisplayDate, formatMoney, type BookingView } from '@voyago/shared';
import { PrintButton } from '@/components/booking/PrintButton';
import { Logo } from '@/components/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiFetchOrNull } from '@/lib/api';
import { getCurrentUser, loginPathFor } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Voucher ${reference.toUpperCase()}` };
}

export default async function VoucherPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(loginPathFor(`/bookings/${reference}/voucher`));

  const booking = await apiFetchOrNull<BookingView>(`/bookings/${reference}`);
  if (!booking) {
    return (
      <div className="vg-container py-12">
        <EmptyState
          title="Voucher not available"
          description="We could not find that booking under your account."
          icon="🔒"
          action={<ButtonLink href="/bookings">View my bookings</ButtonLink>}
        />
      </div>
    );
  }

  const lead = booking.guests.find((guest) => guest.isLeadGuest) ?? booking.guests[0];

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
            <p className="mt-2 text-xs text-ink-muted">Hotel booking voucher</p>
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
            <h2 className="vg-label">Property</h2>
            <p className="mt-1 font-display text-xl font-bold text-ink">{booking.hotel.name}</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              {booking.hotel.addressLine}, {booking.hotel.locality}
              <br />
              {booking.hotel.city}, {booking.hotel.state}
            </p>
            <p className="mt-1 text-sm text-ink-soft">Telephone: {booking.hotel.phone}</p>
          </section>

          <section className="grid gap-5 border-t border-sand-200 pt-5 sm:grid-cols-2">
            <div>
              <h2 className="vg-label">Check-in</h2>
              <p className="mt-1 text-base font-semibold text-ink">
                {formatDisplayDate(booking.checkIn)}
              </p>
              <p className="text-xs text-ink-muted">from {booking.hotel.checkInTime}</p>
            </div>
            <div>
              <h2 className="vg-label">Check-out</h2>
              <p className="mt-1 text-base font-semibold text-ink">
                {formatDisplayDate(booking.checkOut)}
              </p>
              <p className="text-xs text-ink-muted">by {booking.hotel.checkOutTime}</p>
            </div>
            <div>
              <h2 className="vg-label">Lead guest</h2>
              <p className="mt-1 text-base font-semibold text-ink">
                {lead ? `${lead.firstName} ${lead.lastName}` : '—'}
              </p>
              <p className="text-xs text-ink-muted">{booking.contact.email}</p>
              <p className="text-xs text-ink-muted">{booking.contact.phone}</p>
            </div>
            <div>
              <h2 className="vg-label">Occupancy</h2>
              <p className="mt-1 text-base font-semibold text-ink">
                {booking.rooms} room{booking.rooms > 1 ? 's' : ''} · {booking.nights} night
                {booking.nights > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-ink-muted">
                {booking.adults} adult{booking.adults > 1 ? 's' : ''}
                {booking.children > 0 ? `, ${booking.children} children` : ''}
              </p>
            </div>
          </section>

          <section className="border-t border-sand-200 pt-5">
            <h2 className="vg-label">Room and rate</h2>
            <p className="mt-1 text-base font-semibold text-ink">{booking.roomName}</p>
            <p className="text-sm text-ink-soft">{booking.ratePlanName}</p>
            {booking.guests.length > 1 ? (
              <ul className="mt-2 text-sm text-ink-soft">
                {booking.guests.map((guest, index) => (
                  <li key={`${guest.firstName}-${index}`}>
                    Room {index + 1}: {guest.firstName} {guest.lastName}
                  </li>
                ))}
              </ul>
            ) : null}
            {booking.specialRequests ? (
              <p className="mt-2 text-sm text-ink-soft">
                <span className="font-semibold">Special requests:</span> {booking.specialRequests}
              </p>
            ) : null}
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

          <section className="border-t border-sand-200 pt-5">
            <h2 className="vg-label">Cancellation policy</h2>
            <p className="mt-1 text-sm font-semibold text-ink-soft">
              {booking.cancellationPolicy.name}
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
              {booking.cancellationPolicy.description}
            </p>
          </section>
        </div>

        <footer className="border-t border-sand-200 bg-sand-100 p-5 text-xs leading-relaxed text-ink-muted print:bg-white">
          <p className="font-semibold text-ink">
            This is a demonstration voucher issued by Voyago, a portfolio project.
          </p>
          <p className="mt-1">
            It is not a valid travel document. The property shown is demo inventory, has not been
            contacted, and no payment was taken. Issued{' '}
            {new Date(booking.createdAt).toLocaleString('en-IN', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
            .
          </p>
        </footer>
      </article>
    </div>
  );
}
