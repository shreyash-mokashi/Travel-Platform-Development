import type { Prisma } from '@prisma/client';
import {
  evaluateCancellation,
  type BookingView,
  type CancellationPolicy,
  type MealPlan,
  type PriceBreakdown,
} from '@voyago/shared';
import { fromDbDate } from '../../common/utils/dates';

export const BOOKING_INCLUDE = {
  guests: { orderBy: { position: 'asc' } },
  payments: { orderBy: { createdAt: 'desc' } },
  statusEvents: { orderBy: { createdAt: 'asc' } },
  refund: true,
} satisfies Prisma.BookingInclude;

export type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;

interface HotelSnapshot {
  id: string;
  slug: string;
  name: string;
  starRating: number;
  addressLine: string;
  locality: string;
  city: string;
  state: string;
  checkInTime: string;
  checkOutTime: string;
  phone: string;
  imageUrl: string | null;
}

/** Shapes a booking row (and its immutable snapshots) into the API view. */
export function toBookingView(booking: BookingWithRelations, now = new Date()): BookingView {
  const policy = booking.cancellationPolicySnapshot as unknown as CancellationPolicy;
  const priceSnapshot = booking.priceSnapshot as unknown as PriceBreakdown;
  const hotel = booking.hotelSnapshot as unknown as HotelSnapshot;
  const checkIn = fromDbDate(booking.checkIn);

  const cancellable = booking.status === 'CONFIRMED';
  const preview = cancellable
    ? evaluateCancellation({ policy, totalMinor: booking.totalMinor, checkIn, now })
    : null;

  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    refundStatus: booking.refundStatus,
    currency: booking.currency,
    checkIn,
    checkOut: fromDbDate(booking.checkOut),
    nights: booking.nights,
    rooms: booking.rooms,
    adults: booking.adults,
    children: booking.children,
    hotel,
    roomName: booking.roomName,
    ratePlanName: booking.ratePlanName,
    mealPlan: booking.mealPlan as MealPlan,
    cancellationPolicy: policy,
    priceSnapshot,
    totalMinor: booking.totalMinor,
    refundMinor: booking.refundMinor,
    contact: { email: booking.contactEmail, phone: booking.contactPhone },
    specialRequests: booking.specialRequests,
    guests: booking.guests.map((guest) => ({
      firstName: guest.firstName,
      lastName: guest.lastName,
      isLeadGuest: guest.isLeadGuest,
    })),
    paymentAttempts: booking.payments.map((payment) => ({
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
