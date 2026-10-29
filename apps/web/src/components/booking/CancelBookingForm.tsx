'use client';

import { useState } from 'react';
import { formatMoney } from '@voyago/shared';
import { Button } from '../ui/Button';

export function CancelBookingForm({
  reference,
  preview,
}: {
  reference: string;
  preview: { refundMinor: number; penaltyMinor: number; reason: string } | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

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
        <form
          // A plain POST to a route handler on purpose - see the handler's
          // comment for the server-action race this avoids.
          method="post"
          action={`/bookings/${reference}/cancel`}
          onSubmit={() => setPending(true)}
          className="mt-4 space-y-3"
        >
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
          <p className="text-xs text-ink-muted">
            Cancellation cannot be undone. Refunds are simulated — no money moves.
          </p>
        </form>
      )}
    </div>
  );
}
