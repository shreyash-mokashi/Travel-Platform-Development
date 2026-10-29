import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { FlightQuoteView } from '@voyago/shared';
import { FlightCheckoutForm } from '@/components/flights/FlightCheckoutForm';
import { FlightFareSummary } from '@/components/flights/FlightFareSummary';
import { QuoteCountdown } from '@/components/checkout/QuoteCountdown';
import { Alert } from '@/components/ui/Alert';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiFetch } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { getCurrentUser, loginPathFor } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Free hosting suspends an idle API, so the first render after a quiet period
// waits while it wakes. Vercel's default function limit is well under that.
export const maxDuration = 60;

export const metadata: Metadata = { title: 'Passenger details' };

export default async function FlightCheckoutPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(loginPathFor(`/flights/checkout/${quoteId}`));

  let quote: FlightQuoteView;
  try {
    // Re-reading the quote reprices it, so an expired hold is caught here.
    quote = await apiFetch<FlightQuoteView>(`/flight-quotes/${quoteId}`);
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'We could not load your selected fare. Please search again.';
    return (
      <div className="vg-container py-12">
        <EmptyState
          title="This fare hold is no longer valid"
          description={message}
          icon="⏱️"
          action={<ButtonLink href="/flights">Start a new search</ButtonLink>}
        />
      </div>
    );
  }

  const travellersLabel = `${quote.adults} adult${quote.adults > 1 ? 's' : ''}${
    quote.children > 0 ? ` · ${quote.children} child${quote.children > 1 ? 'ren' : ''}` : ''
  }`;

  return (
    <div className="vg-container py-8">
      <nav aria-label="Checkout progress" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          <li className="font-semibold text-ink-muted">1. Choose a fare</li>
          <li aria-hidden className="text-ink-muted">
            →
          </li>
          <li aria-current="step" className="font-semibold text-brand-700">
            2. Passenger details
          </li>
          <li aria-hidden className="text-ink-muted">
            →
          </li>
          <li className="text-ink-muted">3. Demo payment</li>
        </ol>
      </nav>

      <h1 className="font-display text-3xl font-bold text-ink">Complete your booking</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Review your flight and enter passenger details. Nothing is charged at this step.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 lg:order-1">
          <QuoteCountdown expiresAt={quote.expiresAt} />

          {quote.priceChanged && quote.previousTotalMinor !== null ? (
            <Alert tone="warning" title="The fare changed" className="mb-5">
              The total for this fare was updated when we rechecked availability. The amount shown
              now is the price you will pay.
            </Alert>
          ) : null}

          <FlightCheckoutForm
            quoteId={quote.quoteId}
            adults={quote.adults}
            childCount={quote.children}
            defaultEmail={user.email}
            policyName={quote.fare.cancellationPolicy.name}
          />
        </div>

        <aside className="lg:order-2 lg:sticky lg:top-20 lg:self-start">
          <FlightFareSummary
            segment={quote.segment}
            fareName={quote.fare.name}
            cabin={quote.fare.cabin}
            refundable={quote.fare.refundable}
            policyName={quote.fare.cancellationPolicy.name}
            price={quote.fare.price}
            travellersLabel={travellersLabel}
          />
        </aside>
      </div>
    </div>
  );
}
