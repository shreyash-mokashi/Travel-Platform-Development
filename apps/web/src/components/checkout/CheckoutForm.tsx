'use client';

import { useActionState, useState } from 'react';
import type { QuoteResponse } from '@voyago/shared';
import { createBookingAction } from '@/lib/actions';
import { emptyActionState } from '@/lib/action-state';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

function Field({
  id,
  label,
  children,
  hint,
  error,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="vg-label">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs font-medium text-coral-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckoutForm({
  quote,
  defaultEmail,
  defaultFirstName,
  defaultLastName,
  defaultPhone,
}: {
  quote: QuoteResponse;
  defaultEmail: string;
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
}) {
  const [state, formAction, pending] = useActionState(createBookingAction, emptyActionState);
  // One guest name per room keeps the form short while still naming each room.
  const [guestCount] = useState(quote.rooms);

  return (
    <form action={formAction} className="space-y-6" data-testid="checkout-form">
      <input type="hidden" name="quoteId" value={quote.quoteId} />
      <input type="hidden" name="guestCount" value={guestCount} />

      {state.message ? (
        <Alert tone="error" title="Your booking could not be created">
          {state.message}
        </Alert>
      ) : null}

      <section className="vg-card p-5">
        <h2 className="font-display text-lg font-bold text-ink">Who is checking in?</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Enter the lead guest for each room exactly as it appears on their photo ID.
        </p>

        <div className="mt-4 space-y-5">
          {Array.from({ length: guestCount }, (_, index) => (
            <fieldset key={index} className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-1 text-sm font-semibold text-ink-soft">
                {guestCount > 1 ? `Room ${index + 1} lead guest` : 'Lead guest'}
              </legend>
              <Field id={`guestFirstName-${index}`} label="First name">
                <input
                  id={`guestFirstName-${index}`}
                  name={`guestFirstName-${index}`}
                  required
                  maxLength={60}
                  autoComplete={index === 0 ? 'given-name' : 'off'}
                  defaultValue={index === 0 ? defaultFirstName : ''}
                  className="vg-input"
                  data-testid={`guest-first-name-${index}`}
                />
              </Field>
              <Field id={`guestLastName-${index}`} label="Last name">
                <input
                  id={`guestLastName-${index}`}
                  name={`guestLastName-${index}`}
                  required
                  maxLength={60}
                  autoComplete={index === 0 ? 'family-name' : 'off'}
                  defaultValue={index === 0 ? defaultLastName : ''}
                  className="vg-input"
                  data-testid={`guest-last-name-${index}`}
                />
              </Field>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="vg-card p-5">
        <h2 className="font-display text-lg font-bold text-ink">Contact details</h2>
        <p className="mt-1 text-sm text-ink-muted">
          We send the booking confirmation and voucher here.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field id="contactEmail" label="Email address" error={state.fieldErrors?.contactEmail}>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              required
              autoComplete="email"
              defaultValue={defaultEmail}
              className={`vg-input ${state.fieldErrors?.contactEmail ? 'vg-input-error' : ''}`}
              data-testid="contact-email"
            />
          </Field>
          <Field
            id="contactPhone"
            label="Phone number"
            hint="Include the country code, e.g. +91 98200 12345"
            error={state.fieldErrors?.contactPhone}
          >
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              required
              autoComplete="tel"
              pattern="^\+?[0-9][0-9\s-]{7,16}$"
              defaultValue={defaultPhone}
              className={`vg-input ${state.fieldErrors?.contactPhone ? 'vg-input-error' : ''}`}
              data-testid="contact-phone"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field
            id="specialRequests"
            label="Special requests (optional)"
            hint="Requests are passed to the property and are not guaranteed."
          >
            <textarea
              id="specialRequests"
              name="specialRequests"
              rows={3}
              maxLength={500}
              className="vg-input resize-y"
              placeholder="High floor, late check-in, airport pickup…"
              data-testid="special-requests"
            />
          </Field>
        </div>
      </section>

      <section className="vg-card p-5">
        <h2 className="font-display text-lg font-bold text-ink">Cancellation policy</h2>
        <div className="mt-3 rounded-xl bg-sand-100 p-4">
          <p className="text-sm font-semibold text-ink">
            {quote.offer.ratePlan.cancellationPolicy.name}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            {quote.offer.ratePlan.cancellationPolicy.description}
          </p>
          {quote.offer.ratePlan.cancellationPolicy.tiers.length > 0 ? (
            <ul className="mt-2.5 list-inside list-disc space-y-1 text-xs text-ink-soft">
              {quote.offer.ratePlan.cancellationPolicy.tiers.map((tier) => (
                <li key={tier.hoursBeforeCheckIn}>{tier.label}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="acceptedCancellationPolicy"
            required
            className="mt-0.5 h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
            data-testid="accept-policy"
          />
          <span className="text-ink-soft">
            I have read and accept the cancellation policy and the property rules for this booking.
          </span>
        </label>
      </section>

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={pending}
        data-testid="continue-to-payment"
      >
        {pending ? 'Creating your booking…' : 'Review and continue to payment'}
      </Button>
      <p className="text-center text-xs text-ink-muted">
        Your booking is held while you pay. No money is charged at any point — payments on Voyago
        are simulated.
      </p>
    </form>
  );
}
