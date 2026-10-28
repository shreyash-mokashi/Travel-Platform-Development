import type { Metadata } from 'next';
import { formatMoney } from '@voyago/shared';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Admin refunds' };

interface RefundRow {
  id: string;
  bookingReference: string;
  contactEmail: string;
  bookingStatus: string;
  status: string;
  amountMinor: number;
  penaltyMinor: number;
  reason: string;
  requestedAt: string;
  settledAt: string | null;
}

const TONE: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  REFUNDED: 'success',
  PENDING: 'warning',
  REQUESTED: 'warning',
  REJECTED: 'danger',
  NOT_APPLICABLE: 'neutral',
};

export default async function AdminRefundsPage() {
  const data = await apiFetch<{ items: RefundRow[]; total: number }>('/admin/refunds?pageSize=50');

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-sm text-ink">
        <span className="font-semibold">Simulated refunds. </span>
        These records show what the cancellation policy decided. No money has moved and no payment
        processor was contacted.
      </div>

      <p className="text-sm text-ink-muted">{data.total} refund record(s)</p>

      {data.items.length === 0 ? (
        <EmptyState
          title="No refunds yet"
          description="Refund records appear here once a paid booking is cancelled."
          icon="💸"
        />
      ) : (
        <div className="vg-card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-sand-200 text-left">
                <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                  Booking
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                  Outcome
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-ink-soft">
                  Retained
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-ink-soft">
                  Refunded
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">
                  Requested
                </th>
              </tr>
            </thead>
            <tbody data-testid="admin-refund-rows">
              {data.items.map((refund) => (
                <tr key={refund.id} className="border-b border-sand-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">
                    {refund.bookingReference}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{refund.contactEmail}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TONE[refund.status] ?? 'neutral'}>{refund.status}</Badge>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-muted">
                      {refund.reason}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {formatMoney(refund.penaltyMinor)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-brand-700">
                    {formatMoney(refund.amountMinor)}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {new Date(refund.requestedAt).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
