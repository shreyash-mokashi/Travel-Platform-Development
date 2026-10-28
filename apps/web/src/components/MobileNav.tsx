'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AuthUser } from '@voyago/shared';
import { logoutAction } from '@/lib/actions';

export function MobileNav({
  user,
  links,
}: {
  user: AuthUser | null;
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever navigation happens, including back/forward.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="rounded-lg p-2 text-ink-soft hover:bg-sand-200"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open ? (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-16 z-40 animate-fade-up border-b border-sand-300 bg-sand-100 px-4 pb-6 pt-2 shadow-lift"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-3 text-base font-medium text-ink-soft hover:bg-sand-200"
              >
                {link.label}
              </Link>
            ))}
            {user?.role === 'ADMIN' ? (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-3 text-base font-medium text-brand-700"
              >
                Admin dashboard
              </Link>
            ) : null}

            <div className="mt-3 border-t border-sand-300 pt-3">
              {user ? (
                <>
                  <Link
                    href="/account"
                    className="block rounded-lg px-3 py-3 text-base text-ink-soft"
                  >
                    Account · {user.firstName}
                  </Link>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="w-full rounded-lg px-3 py-3 text-left text-base text-ink-muted"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block rounded-lg px-3 py-3 text-base text-ink-soft"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="mt-1 block rounded-xl bg-brand-600 px-3 py-3 text-center text-base font-semibold text-white"
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
