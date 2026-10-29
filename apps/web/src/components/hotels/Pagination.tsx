import Link from 'next/link';

/**
 * Server-rendered pagination so each page of results has its own URL and the
 * back button behaves correctly.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav
      aria-label="Search results pages"
      className="flex items-center justify-center gap-1.5 pt-2"
    >
      <PageLink
        href={buildHref(page - 1)}
        disabled={page <= 1}
        label="Previous page"
        testId="page-prev"
      >
        ‹
      </PageLink>

      {pages.map((entry, index) =>
        entry === null ? (
          <span key={`gap-${index}`} className="px-2 text-ink-muted">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={buildHref(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={`min-w-9 rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${
              entry === page
                ? 'bg-brand-600 text-white'
                : 'border border-sand-300 bg-white text-ink-soft hover:border-brand-400 hover:text-brand-700'
            }`}
            data-testid={`page-${entry}`}
          >
            {entry}
          </Link>
        ),
      )}

      <PageLink
        href={buildHref(page + 1)}
        disabled={page >= totalPages}
        label="Next page"
        testId="page-next"
      >
        ›
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
  testId,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
  testId: string;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        aria-label={label}
        className="min-w-9 rounded-lg border border-sand-200 px-3 py-2 text-center text-sm text-ink-muted"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      data-testid={testId}
      className="min-w-9 rounded-lg border border-sand-300 bg-white px-3 py-2 text-center text-sm text-ink-soft transition hover:border-brand-400 hover:text-brand-700"
    >
      {children}
    </Link>
  );
}

/** Produces [1, null, 4, 5, 6, null, 12] style windows. */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const window = new Set([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...window]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const output: (number | null)[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) output.push(null);
    output.push(value);
    previous = value;
  }
  return output;
}
