'use client';

import { useActionState } from 'react';
import { resolvePendingPaymentAction } from '@/lib/actions';
import { emptyActionState } from '@/lib/action-state';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

/** Finishes the deliberately-pending demo payment scenario. */
export function ResolvePendingForm({ reference }: { reference: string }) {
  const [state, formAction, pending] = useActionState(
    resolvePendingPaymentAction,
    emptyActionState,
  );

  return (
    <div className="vg-card p-5" data-testid="resolve-pending">
      <h2 className="font-display text-base font-bold text-ink">Pending demo payment</h2>
      <p className="mt-1.5 text-sm text-ink-soft">
        The demo gateway is holding this payment for review. Choose how the test scenario should
        finish.
      </p>

      {state.message ? (
        <Alert tone="error" className="mt-3">
          {state.message}
        </Alert>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <form action={formAction} className="flex-1">
          <input type="hidden" name="reference" value={reference} />
          <input type="hidden" name="outcome" value="SUCCESS" />
          <Button type="submit" fullWidth disabled={pending} data-testid="resolve-success">
            Settle as successful
          </Button>
        </form>
        <form action={formAction} className="flex-1">
          <input type="hidden" name="reference" value={reference} />
          <input type="hidden" name="outcome" value="FAILURE" />
          <Button
            type="submit"
            variant="danger"
            fullWidth
            disabled={pending}
            data-testid="resolve-failure"
          >
            Settle as failed
          </Button>
        </form>
      </div>
    </div>
  );
}
