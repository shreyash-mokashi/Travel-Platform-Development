'use client';

import { useActionState } from 'react';
import { createFlightBookingAction } from '@/lib/actions';
import { emptyActionState } from '@/lib/action-state';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

/**
 * Passenger and contact details. The number of name rows is fixed by the
 * quote (one per traveller), matching what the API enforces.
 */
export function FlightCheckoutForm({
  quoteId,
  adults,
  childCount,
  defaultEmail,
  policyName,
}: {
  quoteId: string;
  adults: number;
  /** Named childCount because `children` is reserved for React's own prop. */
  childCount: number;
  defaultEmail: string;
  policyName: string;
}) {
  const [state, formAction, pending] = useActionState(createFlightBookingAction, emptyActionState);
  const travellers = [
    ...Array.from({ length: adults }, (_, index) => ({
      label: `Adult ${index + 1}`,
      key: `adult-${index}`,
    })),
    ...Array.from({ length: childCount }, (_, index) => ({
      label: `Child ${index + 1}`,
      key: `child-${index}`,
    })),
  ];

  return (
    <form action={formAction} className="space-y-5" data-testid="flight-checkout-form">
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="passengerCount" value={travellers.length} />

      {state.message ? (
        <Alert tone="error" title="We could not create your booking">
          {state.message}
        </Alert>
      ) : null}

      <section className="vg-card p-5">
        <h2 className="font-display text-base font-bold text-ink">Who is flying?</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Enter each traveller exactly as the name appears on their photo ID. The first adult is the
          lead passenger.
        </p>
        <div className="mt-4 space-y-4">
          {travellers.map((traveller, index) => (
            <fieldset key={traveller.key}>
              <legend className="vg-label">{traveller.label}</legend>
              <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`passengerFirstName-${index}`} className="sr-only">
                    {traveller.label} first name
                  </label>
                  <input
                    id={`passengerFirstName-${index}`}
                    name={`passengerFirstName-${index}`}
                    required
                    maxLength={80}
                    placeholder="First name"
                    autoComplete="given-name"
                    className="vg-input"
                    data-testid={`passenger-first-${index}`}
                  />
                </div>
                <div>
                  <label htmlFor={`passengerLastName-${index}`} className="sr-only">
                    {traveller.label} last name
                  </label>
                  <input
                    id={`passengerLastName-${index}`}
                    name={`passengerLastName-${index}`}
                    required
                    maxLength={80}
                    placeholder="Last name"
                    autoComplete="family-name"
                    className="vg-input"
                    data-testid={`passenger-last-${index}`}
                  />
                </div>
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="vg-card p-5">
        <h2 className="font-display text-base font-bold text-ink">Contact details</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="contactEmail" className="vg-label">
              Email address
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              required
              defaultValue={defaultEmail}
              autoComplete="email"
              className="vg-input mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="contactPhone" className="vg-label">
              Phone number
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              required
              maxLength={25}
              placeholder="+91 98XXX XXXXX"
              autoComplete="tel"
              className="vg-input mt-1.5"
            />
          </div>
        </div>
      </section>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          name="acceptedCancellationPolicy"
          required
          className="mt-0.5 h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
          data-testid="accept-fare-rules"
        />
        <span>
          I accept the fare rules: <span className="font-medium text-ink">{policyName}</span>. This
          is a demo booking — no real seat is reserved and no money is charged.
        </span>
      </label>

      <Button type="submit" fullWidth disabled={pending} data-testid="continue-to-payment">
        {pending ? 'Creating your booking…' : 'Review and continue to payment'}
      </Button>
    </form>
  );
}
