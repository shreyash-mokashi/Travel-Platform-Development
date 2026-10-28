import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BOOKING_STATUS,
  formatDisplayDate,
  formatMoney,
  type BookingView,
  type Paginated,
} from '@voyago/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { apiFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Admin bookings' };

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page } = await searchParams;

  const query = new URLSearchParams({ page: String(Number(page) || 1), pageSize: '20' });
  if (q) query.set('q', q);
  if (status && status in BOOKING_STATUS) query.set('status', status);

  const data = await apiFetch<Paginated<BookingView>>(`/admin/bookings?${query.toString()}`);

  return (
    <div className="space-y-5">
      <form className="vg-card flex flex-wrap items-end gap-3 p-4" method="get">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="vg-label">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Reference, guest email or hotel name"
            className="vg-input mt-1.5"
            data-testid="admin-search"
          />
        </div>
        <div>
          <label htmlFor="status" className="vg-label">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            className="vg-input mt-1.5"
            data-testid="admin-status-filter"
          >
            <option value="">All statuses</option>
            {Object.values(BOOKING_STATUS).map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Apply
        </button>
        {q || status ? (
          <Link
            href="/admin/bookings"
            className="px-3 py-2.5 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <p className="text-sm text-ink-muted" data-testid="admin-booking-count">
        {data.total} booking{data.total === 1 ? '' : 's'} found
      </p>

      {data.items.length === 0 ? (
        <EmptyState
          title="No bookings match"
          description="Adjust the search term or status filter to widen the results."
          icon="🔍"
        />
      ) : (
        <div className="vg-card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-sand-200 text-left">
                <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                  Reference
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                  Hotel
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                  Stay
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                  Guest
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                  Payment
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-ink-soft">
                  Total
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-ink-soft">
                  Refund
                </th>
              </tr>
            </thead>
            <tbody data-testid="admin-booking-rows">
              {data.items.map((booking) => (
                <tr key={booking.id} className="border-b border-sand-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">
                    {booking.reference}
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-ink-soft">{booking.hotel.name}</span>
                    <span className="block text-xs text-ink-faint">{booking.hotel.city}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {formatDisplayDate(booking.checkIn)} –<br />
                    {formatDisplayDate(booking.checkOut)}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{booking.contact.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">{booking.paymentStatus}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                    {formatMoney(booking.totalMinor)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-700">
                    {booking.refundMinor !== null ? formatMoney(booking.refundMinor) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.totalPages > 1 ? (
        <nav aria-label="Pages" className="flex justify-center gap-2">
          {Array.from({ length: data.totalPages }, (_, index) => index + 1).map((value) => {
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (status) params.set('status', status);
            params.set('page', String(value));
            return (
              <Link
                key={value}
                href={`/admin/bookings?${params.toString()}`}
                aria-current={value === data.page ? 'page' : undefined}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${
                  value === data.page
                    ? 'bg-brand-600 text-white'
                    : 'border border-sand-300 bg-white text-ink-soft hover:border-brand-400'
                }`}
              >
                {value}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
