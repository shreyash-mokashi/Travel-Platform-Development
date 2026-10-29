import type { Prisma } from '@prisma/client';
import {
  evaluateCancellation,
  type CabinValue,
  type CancellationPolicy,
  type FarePriceBreakdown,
  type FlightBookingView,
  type FlightSegmentView,
} from '@voyago/shared';
import { fromDbDate } from '../../common/utils/dates';

export const FLIGHT_BOOKING_INCLUDE = {
  passengers: { orderBy: { position: 'asc' } },
  paymentAttempts: { orderBy: { createdAt: 'desc' } },
  statusEvents: { orderBy: { createdAt: 'asc' } },
  refund: true,
} satisfies Prisma.FlightBookingInclude;

export type FlightBookingWithRelations = Prisma.FlightBookingGetPayload<{
  include: typeof FLIGHT_BOOKING_INCLUDE;
}>;

/** Shapes a flight booking row (and its immutable snapshots) into the API view. */
export function toFlightBookingView(
  booking: FlightBookingWithRelations,
  now = new Date(),
): FlightBookingView {
  const policy = booking.cancellationPolicySnapshot as unknown as CancellationPolicy;
  const priceSnapshot = booking.priceSnapshot as unknown as FarePriceBreakdown;
  const segment = booking.flightSnapshot as unknown as FlightSegmentView;
  const travelDate = fromDbDate(booking.travelDate);

  const cancellable = booking.status === 'CONFIRMED';
  const preview = cancellable
    ? evaluateCancellation({ policy, totalMinor: booking.totalMinor, checkIn: travelDate, now })
    : null;

  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    refundStatus: booking.refundStatus,
    currency: booking.currency,
    travelDate,
    adults: booking.adults,
    children: booking.children,
    segment,
    fareName: booking.fareName,
    cabin: booking.cabin as CabinValue,
    cancellationPolicy: policy,
    priceSnapshot,
    totalMinor: booking.totalMinor,
    refundMinor: booking.refundMinor,
    contact: { email: booking.contactEmail, phone: booking.contactPhone },
    passengers: booking.passengers.map((passenger) => ({
      firstName: passenger.firstName,
      lastName: passenger.lastName,
      isLeadPassenger: passenger.isLeadPassenger,
    })),
    paymentAttempts: booking.paymentAttempts.map((payment) => ({
      id: payment.id,
      scenario: payment.scenario,
      status: payment.status,
      amountMinor: payment.amountMinor,
      failureReason: payment.failureReason,
      createdAt: payment.createdAt.toISOString(),
      settledAt: payment.settledAt?.toISOString() ?? null,
    })),
    statusHistory: booking.statusEvents.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
    })),
    cancellationPreview: preview
      ? {
          refundMinor: preview.refundMinor,
          penaltyMinor: preview.penaltyMinor,
          reason: preview.reason,
        }
      : null,
    paymentDeadline: booking.paymentDeadline.toISOString(),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}
