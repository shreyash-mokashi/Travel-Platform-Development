'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only safe identifier to surface; details stay server-side.
    console.error('Page error', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="vg-container flex flex-col items-center gap-4 py-24 text-center">
      <span className="text-4xl" aria-hidden>
        ⚠️
      </span>
      <h1 className="font-display text-2xl text-ink">Something went wrong</h1>
      <p className="max-w-md text-sm text-ink-muted">
        We could not load this page. This is usually temporary — try again, or go back to search.
      </p>
      {error.digest ? <p className="text-xs text-ink-faint">Reference: {error.digest}</p> : null}
      <div className="mt-2 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Back to search
        </ButtonLink>
      </div>
    </div>
  );
}
