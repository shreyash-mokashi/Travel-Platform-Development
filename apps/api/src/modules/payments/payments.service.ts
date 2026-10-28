import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import type { PaymentAttempt, PaymentStatus } from '@prisma/client';
import { type BookingView } from '@voyago/shared';
import { generateSimulatorRef } from '../../common/utils/reference';
import { PrismaService } from '../../prisma/prisma.service';
import { BOOKING_INCLUDE, toBookingView } from '../bookings/booking.mapper';
import { BookingsService } from '../bookings/bookings.service';
import type { ResolvePendingPaymentDto, SimulatePaymentDto } from './dto/payment.dto';

export const DEMO_PAYMENT_NOTICE = 'Demo Payment — No real money is charged.';

/**
 * A deterministic payment simulator. It never contacts a gateway, never sees
 * card details, and derives the booking outcome from the requested scenario
 * on the server - a client cannot declare a booking paid.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
  ) {}

  async simulate(
    idOrReference: string,
    dto: SimulatePaymentDto,
    userId: string,
  ): Promise<{ booking: BookingView; attempt: PaymentAttempt; notice: string }> {
    const booking = await this.bookings.loadOwned(idOrReference, userId);

    // Replaying an idempotency key returns the original outcome untouched.
    const replay = await this.prisma.paymentAttempt.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (replay) {
      if (replay.bookingId !== booking.id) {
        throw new ConflictException('This idempotency key was used for a different booking.');
      }
      const current = await this.prisma.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: BOOKING_INCLUDE,
      });
      return { booking: toBookingView(current), attempt: replay, notice: DEMO_PAYMENT_NOTICE };
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

    const outcome = PaymentsService.resolveScenario(dto.scenario);

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
      // The PENDING scenario deliberately stops at PAYMENT_PROCESSING and is
      // finished later through resolvePending().
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

      await tx.paymentAttempt.create({
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

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          status: outcome.bookingStatus,
          paymentStatus: outcome.paymentStatus,
          ...(outcome.bookingStatus === 'CONFIRMED' ? { confirmedAt: new Date() } : {}),
        },
        include: BOOKING_INCLUDE,
      });
    });

    const attempt = updated.payments[0]!;
    this.logger.log(
      `Demo payment ${dto.scenario} for ${updated.reference} -> ${outcome.paymentStatus}`,
    );

    return { booking: toBookingView(updated), attempt, notice: DEMO_PAYMENT_NOTICE };
  }

  /**
   * Resolves a deliberately-pending demo payment. This is the controlled way
   * to finish the PENDING test scenario.
   */
  async resolvePending(
    idOrReference: string,
    dto: ResolvePendingPaymentDto,
    userId: string,
  ): Promise<{ booking: BookingView; notice: string }> {
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

      const pending = await tx.paymentAttempt.findFirst({
        where: { bookingId: booking.id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });
      if (pending) {
        await tx.paymentAttempt.update({
          where: { id: pending.id },
          data: {
            status: paymentStatus,
            settledAt: new Date(),
            failureReason: succeeded ? null : 'Demo scenario: bank declined after review.',
          },
        });
      }

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          status: nextStatus,
          paymentStatus,
          ...(succeeded ? { confirmedAt: new Date() } : {}),
        },
        include: BOOKING_INCLUDE,
      });
    });

    return { booking: toBookingView(updated), notice: DEMO_PAYMENT_NOTICE };
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
