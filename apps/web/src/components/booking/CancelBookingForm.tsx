'use client';

import { useActionState, useState } from 'react';
import { formatMoney } from '@voyago/shared';
import { cancelBookingAction } from '@/lib/actions';
import { emptyActionState } from '@/lib/action-state';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

export function CancelBookingForm({
  reference,
  preview,
}: {
  reference: string;
  preview: { refundMinor: number; penaltyMinor: number; reason: string } | null;
}) {
  const [state, formAction, pending] = useActionState(cancelBookingAction, emptyActionState);
  const [confirming, setConfirming] = useState(false);

  if (state.ok) {
    return (
      <Alert tone="success" title="Cancellation processed">
        {state.message} The refund outcome is shown in your booking details above.
      </Alert>
    );
  }

  return (
    <div className="vg-card p-5" data-testid="cancel-booking">
      <h2 className="font-display text-base font-bold text-ink">Cancel this booking</h2>

      {preview ? (
        <div className="mt-3 rounded-xl bg-sand-100 p-4 text-sm">
          <p className="text-ink-soft">{preview.reason}</p>
          <dl className="mt-3 space-y-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Retained by the property</dt>
              <dd className="font-medium tabular-nums text-ink-soft">
                {formatMoney(preview.penaltyMinor)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-sand-300 pt-1.5">
              <dt className="font-semibold text-ink">Simulated refund</dt>
              <dd
                className="font-display font-bold tabular-nums text-brand-700"
                data-testid="refund-preview"
              >
                {formatMoney(preview.refundMinor)}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {state.message ? (
        <Alert tone="error" className="mt-3">
          {state.message}
        </Alert>
      ) : null}

      {!confirming ? (
        <Button
          variant="danger"
          fullWidth
          className="mt-4"
          onClick={() => setConfirming(true)}
          data-testid="start-cancel"
        >
          Request cancellation
        </Button>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="reference" value={reference} />
          <div>
            <label htmlFor="cancel-reason" className="vg-label">
              Reason (optional)
            </label>
            <textarea
              id="cancel-reason"
              name="reason"
              rows={2}
              maxLength={300}
              className="vg-input mt-1.5 resize-y"
              placeholder="Plans changed, found a better rate…"
              data-testid="cancel-reason"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="danger"
              fullWidth
              disabled={pending}
              data-testid="confirm-cancel"
            >
              {pending ? 'Cancelling…' : 'Confirm cancellation'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
              Keep booking
            </Button>
          </div>
          <p className="text-xs text-ink-faint">
            Cancellation cannot be undone. Refunds are simulated — no money moves.
          </p>
        </form>
      )}
    </div>
  );
}
