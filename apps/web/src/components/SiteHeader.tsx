import Link from 'next/link';
import type { AuthUser } from '@voyago/shared';
import { logoutAction } from '@/lib/actions';
import { Logo } from './Logo';
import { ButtonLink } from './ui/Button';
import { MobileNav } from './MobileNav';

const NAV_LINKS = [
  { href: '/', label: 'Hotels' },
  { href: '/flights', label: 'Flights' },
  { href: '/destinations', label: 'Destinations' },
  { href: '/bookings', label: 'My bookings' },
];

export function SiteHeader({ user }: { user: AuthUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-sand-300/70 bg-sand-100/90 backdrop-blur vg-no-print">
      <div className="vg-container flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Voyago home">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-sand-200 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          {user?.role === 'ADMIN' ? (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
            >
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link
                href="/account"
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-sand-200 hover:text-ink"
              >
                {user.firstName}
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-sand-200 hover:text-ink"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-sand-200 hover:text-ink"
              >
                Sign in
              </Link>
              <ButtonLink href="/register" size="sm">
                Create account
              </ButtonLink>
            </>
          )}
        </div>

        <MobileNav user={user} links={NAV_LINKS} />
      </div>
    </header>
  );
}
