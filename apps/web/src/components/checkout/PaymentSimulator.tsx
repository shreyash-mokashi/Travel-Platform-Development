'use client';

import { useActionState, useMemo } from 'react';
import { PAYMENT_SCENARIO, formatMoney, type PaymentScenario } from '@voyago/shared';
import { payBookingAction } from '@/lib/actions';
import { emptyActionState } from '@/lib/action-state';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

const SCENARIOS: {
  value: PaymentScenario;
  title: string;
  description: string;
  tone: string;
}[] = [
  {
    value: PAYMENT_SCENARIO.SUCCESS,
    title: 'Successful payment',
    description: 'The demo gateway approves immediately and your booking is confirmed.',
    tone: 'border-brand-300 bg-brand-50',
  },
  {
    value: PAYMENT_SCENARIO.FAILURE,
    title: 'Failed payment',
    description: 'The demo gateway declines the payment. You can retry afterwards.',
    tone: 'border-coral-200 bg-coral-50',
  },
  {
    value: PAYMENT_SCENARIO.PENDING,
    title: 'Pending payment',
    description:
      'The demo gateway holds the payment for review. You resolve it from the booking page.',
    tone: 'border-amber-400/40 bg-amber-400/10',
  },
];

/**
 * The demo payment interface. It collects no card details and sends only a
 * scenario name; the API decides the resulting booking state.
 */
export function PaymentSimulator({
  reference,
  amountMinor,
  canRetry,
}: {
  reference: string;
  amountMinor: number;
  canRetry: boolean;
}) {
  const [state, formAction, pending] = useActionState(payBookingAction, emptyActionState);

  // A key generated once per mount; resubmitting the same form is absorbed by
  // the API rather than creating a second charge.
  const idempotencyKey = useMemo(
    () => `${reference}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
    [reference],
  );

  return (
    <div className="vg-card p-5 sm:p-6" data-testid="payment-simulator">
      <div className="rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-3">
        <p className="text-sm font-bold text-ink">Demo Payment — No real money is charged.</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          This is a simulator built for a portfolio project. No card details are collected, no
          payment gateway is contacted, and no funds move. Choose which outcome you want to test.
        </p>
      </div>

      {state.message ? (
        <Alert tone="error" className="mt-4" title="The payment could not be processed">
          {state.message}
        </Alert>
      ) : null}

      {canRetry ? (
        <Alert tone="warning" className="mt-4">
          Your previous demo payment did not go through. You can safely try again below.
        </Alert>
      ) : null}

      <div className="mt-5 flex items-baseline justify-between border-y border-sand-200 py-4">
        <span className="text-sm text-ink-muted">Amount due</span>
        <span
          className="font-display text-2xl font-bold tabular-nums text-ink"
          data-testid="payment-amount"
        >
          {formatMoney(amountMinor)}
        </span>
      </div>

      <form action={formAction} className="mt-5 space-y-3">
        <input type="hidden" name="reference" value={reference} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        <fieldset className="space-y-3">
          <legend className="vg-label mb-2">Choose a demo outcome</legend>
          {SCENARIOS.map((scenario, index) => (
            <label
              key={scenario.value}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition hover:shadow-sm ${scenario.tone}`}
            >
              <input
                type="radio"
                name="scenario"
                value={scenario.value}
                defaultChecked={index === 0}
                required
                className="mt-0.5 h-4 w-4 border-sand-300 text-brand-600 focus:ring-brand-500"
                data-testid={`scenario-${scenario.value}`}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{scenario.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                  {scenario.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <Button type="submit" size="lg" fullWidth disabled={pending} data-testid="submit-payment">
          {pending ? 'Processing demo payment…' : 'Run demo payment'}
        </Button>
      </form>

      <p className="mt-3 text-center text-xs text-ink-muted">
        Submitting twice is safe — each attempt carries an idempotency key, so a duplicate request
        returns the original result instead of charging again.
      </p>
    </div>
  );
}
