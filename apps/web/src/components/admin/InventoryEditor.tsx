'use client';

import { useActionState } from 'react';
import { addDays, todayIso } from '@voyago/shared';
import { updateInventoryAction } from '@/lib/admin-actions';
import { emptyActionState } from '@/lib/action-state';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

/** Bulk availability and tariff editor for one room type over a date range. */
export function InventoryEditor({
  roomId,
  defaultRoomsOpen,
}: {
  roomId: string;
  defaultRoomsOpen: number;
}) {
  const [state, formAction, pending] = useActionState(updateInventoryAction, emptyActionState);
  const today = todayIso();

  return (
    <details className="rounded-xl border border-sand-200 bg-sand-50/60 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-brand-700">
        Edit availability and rates
      </summary>

      <form action={formAction} className="mt-4 space-y-3" data-testid={`inventory-form-${roomId}`}>
        <input type="hidden" name="roomId" value={roomId} />

        {state.message ? (
          <Alert tone={state.ok ? 'success' : 'error'}>{state.message}</Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor={`from-${roomId}`} className="vg-label">
              From
            </label>
            <input
              id={`from-${roomId}`}
              name="fromDate"
              type="date"
              required
              min={today}
              defaultValue={today}
              className="vg-input mt-1.5"
            />
          </div>
          <div>
            <label htmlFor={`to-${roomId}`} className="vg-label">
              To (exclusive)
            </label>
            <input
              id={`to-${roomId}`}
              name="toDate"
              type="date"
              required
              min={addDays(today, 1)}
              defaultValue={addDays(today, 7)}
              className="vg-input mt-1.5"
            />
          </div>
          <div>
            <label htmlFor={`rooms-${roomId}`} className="vg-label">
              Rooms open
            </label>
            <input
              id={`rooms-${roomId}`}
              name="roomsOpen"
              type="number"
              min={0}
              max={500}
              placeholder={String(defaultRoomsOpen)}
              className="vg-input mt-1.5"
            />
          </div>
          <div>
            <label htmlFor={`rate-${roomId}`} className="vg-label">
              Nightly rate (₹)
            </label>
            <input
              id={`rate-${roomId}`}
              name="baseRateRupees"
              type="number"
              min={0}
              step={50}
              placeholder="Leave blank to keep"
              className="vg-input mt-1.5"
            />
          </div>
        </div>

        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Updating…' : 'Apply to date range'}
        </Button>
        <p className="text-xs text-ink-faint">
          Leave a value blank to leave it unchanged. Every change is written to the admin audit log.
        </p>
      </form>
    </details>
  );
}
