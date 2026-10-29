import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatDisplayDate, formatMoney, type BookingView, type Paginated } from '@voyago/shared';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { apiFetch } from '@/lib/api';
import { getCurrentUser, loginPathFor } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Free hosting suspends an idle API, so the first render after a quiet period
// waits while it wakes. Vercel's default function limit is well under that.
export const maxDuration = 60;

export const metadata: Metadata = { title: 'My bookings' };

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(loginPathFor('/bookings'));

  const page = Math.max(1, Number((await searchParams).page) || 1);
  const data = await apiFetch<Paginated<BookingView>>(`/bookings?page=${page}&pageSize=10`);

  return (
    <div className="vg-container py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">My bookings</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Every booking you have made on Voyago, with its live status and refund outcome.
        </p>
      </header>

      {data.items.length === 0 ? (
        <EmptyState
          title="You have no bookings yet"
          description="Once you complete a demo booking it will appear here with its confirmation reference and voucher."
          icon="🧳"
          action={<ButtonLink href="/">Search for hotels</ButtonLink>}
        />
      ) : (
        <>
          <ul className="space-y-4" data-testid="booking-list">
            {data.items.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/bookings/${booking.reference}`}
                  className="vg-card flex flex-col gap-4 overflow-hidden p-4 transition hover:shadow-lift sm:flex-row sm:items-center"
                  data-testid="booking-row"
                  data-booking-reference={booking.reference}
                >
                  <span className="relative block h-32 w-full shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-36">
                    {booking.hotel.imageUrl ? (
                      <Image
                        src={booking.hotel.imageUrl}
                        alt=""
                        fill
                        sizes="144px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center bg-sand-200 text-xs text-ink-muted">
                        No image
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={booking.status} />
                      <span className="font-mono text-xs text-ink-muted">{booking.reference}</span>
                    </span>
                    <span className="mt-1.5 block font-display text-lg font-semibold text-ink">
                      {booking.hotel.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {booking.hotel.city}, {booking.hotel.state} ·{' '}
                      {formatDisplayDate(booking.checkIn)} – {formatDisplayDate(booking.checkOut)} ·{' '}
                      {booking.nights} night{booking.nights > 1 ? 's' : ''}
                    </span>
                    <span className="mt-1 block text-xs text-ink-soft">
                      {booking.roomName} · {booking.ratePlanName}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block font-display text-xl font-bold tabular-nums text-ink">
                      {formatMoney(booking.totalMinor)}
                    </span>
                    {booking.refundMinor !== null && booking.refundMinor > 0 ? (
                      <span className="mt-0.5 block text-xs font-medium text-brand-700">
                        {formatMoney(booking.refundMinor)} refunded
                      </span>
                    ) : null}
                    <span className="mt-1 block text-xs text-brand-700">View details →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {data.totalPages > 1 ? (
            <nav aria-label="Booking pages" className="mt-6 flex justify-center gap-2">
              {Array.from({ length: data.totalPages }, (_, index) => index + 1).map((value) => (
                <Link
                  key={value}
                  href={`/bookings?page=${value}`}
                  aria-current={value === data.page ? 'page' : undefined}
                  className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${
                    value === data.page
                      ? 'bg-brand-600 text-white'
                      : 'border border-sand-300 bg-white text-ink-soft hover:border-brand-400'
                  }`}
                >
                  {value}
                </Link>
              ))}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
