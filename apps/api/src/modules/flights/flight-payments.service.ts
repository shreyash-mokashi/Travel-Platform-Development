import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import type { FlightPaymentAttempt, PaymentStatus } from '@prisma/client';
import { type FlightBookingView } from '@voyago/shared';
import { generateSimulatorRef } from '../../common/utils/reference';
import { PrismaService } from '../../prisma/prisma.service';
import { DEMO_PAYMENT_NOTICE } from '../payments/payments.service';
import type { ResolvePendingPaymentDto, SimulatePaymentDto } from '../payments/dto/payment.dto';
import { FLIGHT_BOOKING_INCLUDE, toFlightBookingView } from './flight-booking.mapper';
import { FlightBookingsService } from './flight-bookings.service';

/**
 * The flight twin of PaymentsService: the same deterministic simulator over
 * the same scenarios and state machine, writing flight_payment_attempts. It
 * never contacts a gateway, never sees card details, and the outcome is
 * decided server-side - a client cannot declare a booking paid.
 */
@Injectable()
export class FlightPaymentsService {
  private readonly logger = new Logger(FlightPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: FlightBookingsService,
  ) {}

  async simulate(
    idOrReference: string,
    dto: SimulatePaymentDto,
    userId: string,
  ): Promise<{ booking: FlightBookingView; attempt: FlightPaymentAttempt; notice: string }> {
    const booking = await this.bookings.loadOwned(idOrReference, userId);

    // Replaying an idempotency key returns the original outcome untouched.
    const replay = await this.prisma.flightPaymentAttempt.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (replay) {
      if (replay.bookingId !== booking.id) {
        throw new ConflictException('This idempotency key was used for a different booking.');
      }
      const current = await this.prisma.flightBooking.findUniqueOrThrow({
        where: { id: booking.id },
        include: FLIGHT_BOOKING_INCLUDE,
      });
      return {
        booking: toFlightBookingView(current),
        attempt: replay,
        notice: DEMO_PAYMENT_NOTICE,
      };
    }

    if (booking.status === 'CONFIRMED') {
      throw new ConflictException('This booking has already been paid and confirmed.');
    }
    if (!['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(booking.status)) {
      throw new ConflictException(`A booking that is "${booking.status}" cannot accept a payment.`);
    }
    if (booking.paymentDeadline <= new Date()) {
      throw new BadRequestException(
        'The payment window for this booking has closed. Please start a new booking.',
      );
    }

    const outcome = FlightPaymentsService.resolveScenario(dto.scenario);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Every payment first moves the booking into PAYMENT_PROCESSING, so the
      // history records the attempt even when it fails.
      await this.bookings.transition(
        tx,
        booking.id,
        booking.status,
        'PAYMENT_PROCESSING',
        'Demo payment submitted.',
        userId,
      );
      if (outcome.bookingStatus !== 'PAYMENT_PROCESSING') {
        await this.bookings.transition(
          tx,
          booking.id,
          'PAYMENT_PROCESSING',
          outcome.bookingStatus,
          outcome.note,
          userId,
        );
      }

      await tx.flightPaymentAttempt.create({
        data: {
          bookingId: booking.id,
          idempotencyKey: dto.idempotencyKey,
          scenario: dto.scenario,
          status: outcome.paymentStatus,
          amountMinor: booking.totalMinor,
          failureReason: outcome.failureReason,
          simulatorRef: generateSimulatorRef(),
          settledAt: outcome.paymentStatus === 'PENDING' ? null : new Date(),
        },
      });

      return tx.flightBooking.update({
        where: { id: booking.id },
        data: {
          status: outcome.bookingStatus,
          paymentStatus: outcome.paymentStatus,
          ...(outcome.bookingStatus === 'CONFIRMED' ? { confirmedAt: new Date() } : {}),
        },
        include: FLIGHT_BOOKING_INCLUDE,
      });
    });

    const attempt = updated.paymentAttempts[0]!;
    this.logger.log(
      `Demo payment ${dto.scenario} for ${updated.reference} -> ${outcome.paymentStatus}`,
    );

    return { booking: toFlightBookingView(updated), attempt, notice: DEMO_PAYMENT_NOTICE };
  }

  /** Finishes the deliberately-pending demo scenario, exactly as hotels do. */
  async resolvePending(
    idOrReference: string,
    dto: ResolvePendingPaymentDto,
    userId: string,
  ): Promise<{ booking: FlightBookingView; notice: string }> {
    const booking = await this.bookings.loadOwned(idOrReference, userId);

    if (booking.paymentStatus !== 'PENDING' || booking.status !== 'PAYMENT_PROCESSING') {
      throw new ConflictException('This booking has no pending demo payment to resolve.');
    }

    const succeeded = dto.outcome === 'SUCCESS';
    const nextStatus = succeeded ? 'CONFIRMED' : 'PAYMENT_FAILED';
    const paymentStatus: PaymentStatus = succeeded ? 'SUCCEEDED' : 'FAILED';

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.bookings.transition(
        tx,
        booking.id,
        booking.status,
        nextStatus,
        succeeded
          ? 'Pending demo payment resolved as successful.'
          : 'Pending demo payment resolved as failed.',
        userId,
      );

      const pending = await tx.flightPaymentAttempt.findFirst({
        where: { bookingId: booking.id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });
      if (pending) {
        await tx.flightPaymentAttempt.update({
          where: { id: pending.id },
          data: {
            status: paymentStatus,
            settledAt: new Date(),
            failureReason: succeeded ? null : 'Demo scenario: bank declined after review.',
          },
        });
      }

      return tx.flightBooking.update({
        where: { id: booking.id },
        data: {
          status: nextStatus,
          paymentStatus,
          ...(succeeded ? { confirmedAt: new Date() } : {}),
        },
        include: FLIGHT_BOOKING_INCLUDE,
      });
    });

    return { booking: toFlightBookingView(updated), notice: DEMO_PAYMENT_NOTICE };
  }

  private static resolveScenario(scenario: SimulatePaymentDto['scenario']): {
    bookingStatus: 'CONFIRMED' | 'PAYMENT_FAILED' | 'PAYMENT_PROCESSING';
    paymentStatus: PaymentStatus;
    failureReason: string | null;
    note: string;
  } {
    switch (scenario) {
      case 'SUCCESS':
        return {
          bookingStatus: 'CONFIRMED',
          paymentStatus: 'SUCCEEDED',
          failureReason: null,
          note: 'Demo payment succeeded; booking confirmed.',
        };
      case 'FAILURE':
        return {
          bookingStatus: 'PAYMENT_FAILED',
          paymentStatus: 'FAILED',
          failureReason: 'Demo scenario: card declined by issuing bank.',
          note: 'Demo payment failed; the customer may retry.',
        };
      case 'PENDING':
        return {
          bookingStatus: 'PAYMENT_PROCESSING',
          paymentStatus: 'PENDING',
          failureReason: null,
          note: 'Demo payment is pending bank confirmation.',
        };
      default:
        throw new BadRequestException('Unsupported demo payment scenario.');
    }
  }
}
