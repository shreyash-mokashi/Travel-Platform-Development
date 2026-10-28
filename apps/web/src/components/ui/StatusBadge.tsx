import { BOOKING_STATUS_LABEL, type BookingStatus } from '@voyago/shared';
import { Badge } from './Badge';

const TONE_BY_STATUS = {
  CONFIRMED: 'success',
  PENDING_PAYMENT: 'warning',
  PAYMENT_PROCESSING: 'info',
  PAYMENT_FAILED: 'danger',
  CANCELLATION_REQUESTED: 'warning',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
} as const;

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={TONE_BY_STATUS[status]}>{BOOKING_STATUS_LABEL[status]}</Badge>;
}
