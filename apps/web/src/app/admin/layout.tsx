import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, loginPathFor } from '@/lib/session';

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/hotels', label: 'Inventory' },
  { href: '/admin/refunds', label: 'Refunds' },
  { href: '/admin/audit', label: 'Audit log' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(loginPathFor('/admin'));

  // The API enforces this too; the check here keeps the UI honest.
  if (user.role !== 'ADMIN') {
    return (
      <div className="vg-container py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Administrator access required</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your account does not have permission to view the admin dashboard.
        </p>
        <Link href="/" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">
          ← Back to Voyago
        </Link>
      </div>
    );
  }

  return (
    <div className="vg-container py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Admin dashboard</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Signed in as {user.firstName} {user.lastName}. Every figure here is read live from the
          database.
        </p>
      </header>

      <nav aria-label="Admin sections" className="mb-6 border-b border-sand-300">
        <ul className="-mb-px flex flex-wrap gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className="inline-block whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-brand-400 hover:text-brand-700"
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </div>
  );
}
