import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { QuoteResponse } from '@voyago/shared';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { PriceSummary } from '@/components/checkout/PriceSummary';
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

export const metadata: Metadata = { title: 'Guest details' };

export default async function CheckoutPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(loginPathFor(`/checkout/${quoteId}`));

  let quote: QuoteResponse;
  try {
    // Re-reading the quote reprices it, so an expired hold is caught here.
    quote = await apiFetch<QuoteResponse>(`/quotes/${quoteId}`);
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'We could not load your selected room. Please search again.';
    return (
      <div className="vg-container py-12">
        <EmptyState
          title="This price hold is no longer valid"
          description={message}
          icon="⏱️"
          action={<ButtonLink href="/">Start a new search</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="vg-container py-8">
      <nav aria-label="Checkout progress" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          <li className="font-semibold text-ink-faint">1. Choose a room</li>
          <li aria-hidden className="text-ink-faint">
            →
          </li>
          <li aria-current="step" className="font-semibold text-brand-700">
            2. Guest details
          </li>
          <li aria-hidden className="text-ink-faint">
            →
          </li>
          <li className="text-ink-faint">3. Demo payment</li>
        </ol>
      </nav>

      <h1 className="font-display text-3xl font-bold text-ink">Complete your booking</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Review your stay and enter guest details. Nothing is charged at this step.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 lg:order-1">
          <QuoteCountdown expiresAt={quote.expiresAt} />

          {quote.priceChanged && quote.previousTotalMinor !== null ? (
            <Alert tone="warning" title="The price changed" className="mb-5">
              The total for this room was updated when we rechecked availability. The amount shown
              now is the price you will pay.
            </Alert>
          ) : null}

          <CheckoutForm
            quote={quote}
            defaultEmail={user.email}
            defaultFirstName={user.firstName}
            defaultLastName={user.lastName}
            defaultPhone={user.phone ?? ''}
          />

          <p className="mt-4 text-center text-sm">
            <Link
              href={`/hotels/${quote.hotel.slug}?checkIn=${quote.checkIn}&checkOut=${quote.checkOut}&rooms=${quote.rooms}&adults=${quote.adults}&children=${quote.children}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              ← Choose a different room
            </Link>
          </p>
        </div>

        <aside className="lg:order-2 lg:sticky lg:top-20 lg:self-start">
          <PriceSummary
            hotelName={quote.hotel.name}
            starRating={quote.hotel.starRating}
            addressLine={quote.hotel.addressLine}
            city={quote.destination.city}
            imageUrl={quote.hotel.images[0]?.url ?? null}
            roomName={quote.offer.roomName}
            ratePlanName={quote.offer.ratePlan.name}
            checkIn={quote.checkIn}
            checkOut={quote.checkOut}
            nights={quote.nights}
            rooms={quote.rooms}
            adults={quote.adults}
            childCount={quote.children}
            price={quote.offer.price}
          />
        </aside>
      </div>
    </div>
  );
}
