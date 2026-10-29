import Link from 'next/link';
import { Logo } from './Logo';

const COLUMNS = [
  {
    title: 'Hotels',
    links: [
      { href: '/destinations', label: 'All destinations' },
      { href: '/hotels?destination=goa', label: 'Goa hotels' },
      { href: '/hotels?destination=mumbai', label: 'Mumbai hotels' },
      { href: '/hotels?destination=jaipur', label: 'Jaipur hotels' },
    ],
  },
  {
    title: 'Your trips',
    links: [
      { href: '/bookings', label: 'My bookings' },
      { href: '/account', label: 'Account' },
      { href: '/login', label: 'Sign in' },
      { href: '/register', label: 'Create account' },
    ],
  },
  {
    title: 'Coming next',
    links: [
      { href: '/roadmap', label: 'Flights' },
      { href: '/roadmap', label: 'Holiday packages' },
      { href: '/roadmap', label: 'Activities' },
      { href: '/roadmap', label: 'Car rentals' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-sand-300 bg-ink text-sand-200 vg-no-print">
      <div className="vg-container py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo inverted />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-faint">
              Voyago is a portfolio demonstration of a travel booking platform. Hotel inventory,
              pricing, payments and refunds are all simulated.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="inline-block py-1 text-sm text-ink-faint transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Voyago. A personal portfolio project.</p>
          <p className="font-medium text-amber-400">
            Demo Payment — No real money is charged. No real bookings are made.
          </p>
        </div>
      </div>
    </footer>
  );
}
