'use client';

import { useEffect, useState } from 'react';
import { Alert } from '../ui/Alert';

/**
 * Counts down the server-issued price hold. When it lapses the page stops
 * pretending the price is still valid and tells the user to search again.
 */
export function QuoteCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => msRemaining(expiresAt));

  useEffect(() => {
    const timer = setInterval(() => setRemaining(msRemaining(expiresAt)), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (remaining <= 0) {
    return (
      <Alert tone="error" title="Your price hold has expired" className="mb-5">
        Prices and availability may have changed. Please search again to get a current price.
      </Alert>
    );
  }

  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return (
    <Alert tone={minutes < 3 ? 'warning' : 'info'} className="mb-5">
      <span>
        We are holding this price and room for{' '}
        <strong className="tabular-nums" data-testid="quote-countdown">
          {minutes}:{String(seconds).padStart(2, '0')}
        </strong>
        . Complete your booking before then.
      </span>
    </Alert>
  );
}

function msRemaining(expiresAt: string): number {
  return new Date(expiresAt).getTime() - Date.now();
}
