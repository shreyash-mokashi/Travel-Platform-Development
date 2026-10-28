import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { BookingView, Paginated } from '@voyago/shared';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { ButtonLink } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { apiFetch } from '@/lib/api';
import { getCurrentUser, loginPathFor } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Account' };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect(loginPathFor('/account'));

  const bookings = await apiFetch<Paginated<BookingView>>('/bookings?page=1&pageSize=3');

  return (
    <div className="vg-container py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Hello, {user.firstName}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Manage your profile and review your recent bookings.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section className="vg-card p-6">
          <h2 className="font-display text-lg font-bold text-ink">Profile</h2>
          <p className="mt-1 text-sm text-ink-muted">These details are pre-filled at checkout.</p>
          <div className="mt-5">
            <ProfileForm user={user} />
          </div>
        </section>

        <aside className="space-y-5">
          <div className="vg-card p-5">
            <h2 className="font-display text-base font-bold text-ink">Account</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Role</dt>
                <dd className="font-medium text-ink">
                  {user.role === 'ADMIN' ? 'Administrator' : 'Customer'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Member since</dt>
                <dd className="font-medium text-ink">
                  {new Date(user.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Bookings</dt>
                <dd className="font-medium text-ink">{bookings.total}</dd>
              </div>
            </dl>
            {user.role === 'ADMIN' ? (
              <ButtonLink href="/admin" variant="secondary" fullWidth className="mt-4">
                Open admin dashboard
              </ButtonLink>
            ) : null}
          </div>

          <div className="vg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink">Recent bookings</h2>
              <Link
                href="/bookings"
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                View all
              </Link>
            </div>
            {bookings.items.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">You have no bookings yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {bookings.items.map((booking) => (
                  <li key={booking.id}>
                    <Link
                      href={`/bookings/${booking.reference}`}
                      className="block rounded-lg bg-sand-100 px-3 py-2.5 transition hover:bg-sand-200"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink">
                          {booking.hotel.name}
                        </span>
                        <StatusBadge status={booking.status} />
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-ink-muted">
                        {booking.reference}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
