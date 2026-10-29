import type { Metadata } from 'next';
import Link from 'next/link';
import { formatMoney, type BookingView } from '@voyago/shared';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { apiFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Free hosting suspends an idle API, so the first render after a quiet period
// waits while it wakes. Vercel's default function limit is well under that.
export const maxDuration = 60;

export const metadata: Metadata = { title: 'Admin overview' };

interface Overview {
  bookingsByStatus: { status: string; count: number }[];
  paymentsByStatus: { status: string; count: number }[];
  confirmedBookings: number;
  confirmedRevenueMinor: number;
  refundedBookings: number;
  refundedAmountMinor: number;
  inventory: { hotels: number; rooms: number; destinations: number };
  customers: number;
  supplierSnapshots: number;
  recentBookings: BookingView[];
}

function Metric({
  label,
  value,
  hint,
  testId,
}: {
  label: string;
  value: string;
  hint?: string;
  testId: string;
}) {
  return (
    <div className="vg-card p-5">
      <p className="vg-label">{label}</p>
      <p
        className="mt-1.5 font-display text-2xl font-bold tabular-nums text-ink"
        data-testid={testId}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const data = await apiFetch<Overview>('/admin/overview');
  const totalBookings = data.bookingsByStatus.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-8" data-testid="admin-overview">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Total bookings"
          value={totalBookings.toLocaleString('en-IN')}
          hint={`${data.confirmedBookings} confirmed`}
          testId="metric-bookings"
        />
        <Metric
          label="Confirmed value"
          value={formatMoney(data.confirmedRevenueMinor)}
          hint="Demo currency, not real revenue"
          testId="metric-revenue"
        />
        <Metric
          label="Simulated refunds"
          value={formatMoney(data.refundedAmountMinor)}
          hint={`${data.refundedBookings} refunded bookings`}
          testId="metric-refunds"
        />
        <Metric
          label="Registered customers"
          value={data.customers.toLocaleString('en-IN')}
          hint={`${data.supplierSnapshots} MongoDB price snapshots`}
          testId="metric-customers"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="vg-card p-5">
          <h2 className="font-display text-base font-bold text-ink">Bookings by status</h2>
          {data.bookingsByStatus.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">No bookings yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.bookingsByStatus.map((row) => (
                <li key={row.status} className="flex items-center justify-between gap-3 text-sm">
                  <StatusBadge status={row.status as BookingView['status']} />
                  <span className="font-semibold tabular-nums text-ink">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="vg-card p-5">
          <h2 className="font-display text-base font-bold text-ink">Payments by status</h2>
          {data.paymentsByStatus.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">No payment attempts yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.paymentsByStatus.map((row) => (
                <li key={row.status} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink-soft">{row.status}</span>
                  <span className="font-semibold tabular-nums text-ink">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="vg-card p-5">
          <h2 className="font-display text-base font-bold text-ink">Demo inventory</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Destinations</dt>
              <dd className="font-semibold tabular-nums text-ink">{data.inventory.destinations}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Active hotels</dt>
              <dd className="font-semibold tabular-nums text-ink">{data.inventory.hotels}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Room types</dt>
              <dd className="font-semibold tabular-nums text-ink">{data.inventory.rooms}</dd>
            </div>
          </dl>
          <Link
            href="/admin/hotels"
            className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline"
          >
            Manage inventory →
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Recent bookings</h2>
          <Link
            href="/admin/bookings"
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            View all
          </Link>
        </div>

        {data.recentBookings.length === 0 ? (
          <p className="vg-card mt-3 p-6 text-center text-sm text-ink-muted">
            No bookings have been made yet.
          </p>
        ) : (
          <div className="vg-card mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                    Reference
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                    Hotel
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                    Guest
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-ink-soft">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-sand-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/bookings?q=${booking.reference}`}
                        className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                      >
                        {booking.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{booking.hotel.name}</td>
                    <td className="px-4 py-3 text-ink-muted">{booking.contact.email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                      {formatMoney(booking.totalMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
