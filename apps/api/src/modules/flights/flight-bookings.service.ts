import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { BookingStatus, Prisma } from '@prisma/client';
import {
  BOOKING_PAYMENT_WINDOW_MINUTES,
  DEMO_CURRENCY,
  canTransition,
  evaluateCancellation,
  type CancellationPolicy,
  type FlightBookingView,
} from '@voyago/shared';
import { fromDbDate } from '../../common/utils/dates';
import { generateFlightReference } from '../../common/utils/reference';
import { PrismaService } from '../../prisma/prisma.service';
import type { CancelFlightBookingDto, CreateFlightBookingDto } from './dto/flight.dto';
import { FlightAvailabilityService } from './flight-availability.service';
import {
  FLIGHT_BOOKING_INCLUDE,
  toFlightBookingView,
  type FlightBookingWithRelations,
} from './flight-booking.mapper';
import { FlightQuotesService } from './flight-quotes.service';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class FlightBookingsService {
  private readonly logger = new Logger(FlightBookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quotes: FlightQuotesService,
    private readonly availability: FlightAvailabilityService,
  ) {}

  async create(dto: CreateFlightBookingDto, userId: string): Promise<FlightBookingView> {
    if (!dto.passengers.some((passenger) => passenger.isLeadPassenger)) {
      dto.passengers[0]!.isLeadPassenger = true;
    }
    if (dto.passengers.filter((passenger) => passenger.isLeadPassenger).length > 1) {
      throw new BadRequestException('Only one passenger can be the lead passenger.');
    }

    const quote = await this.quotes.loadQuote(dto.quoteId, userId);
    if (quote.consumedAt) {
      // The quote is single-use; surface the booking it already produced.
      const existing = await this.prisma.flightBooking.findUnique({
        where: { quoteId: quote.id },
        include: FLIGHT_BOOKING_INCLUDE,
      });
      if (existing && existing.userId === userId) return toFlightBookingView(existing);
      throw new ConflictException('This fare quote has already been used for a booking.');
    }
    if (quote.expiresAt <= new Date()) {
      throw new BadRequestException(
        'Your fare hold has expired. Please search again to see current prices.',
      );
    }

    const seats = quote.adults + quote.children;
    if (dto.passengers.length !== seats) {
      throw new BadRequestException(
        `This fare was quoted for ${seats} traveller${seats > 1 ? 's' : ''}; ` +
          `${dto.passengers.length} passenger name${dto.passengers.length > 1 ? 's were' : ' was'} supplied.`,
      );
    }

    const travelDate = fromDbDate(quote.date);

    // Authoritative recheck: never trust anything the client sent about price.
    const offer = await this.availability.findFareOffer({
      flightId: quote.flightId,
      fareClassId: quote.fareClassId,
      date: travelDate,
      adults: quote.adults,
      children: quote.children,
      excludeQuoteId: quote.id,
    });
    if (!offer) {
      throw new ConflictException(
        'That fare sold out while you were booking. Please choose another option.',
      );
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      // Re-read the quote inside the transaction to close the race window.
      const locked = await tx.flightQuote.findUniqueOrThrow({ where: { id: quote.id } });
      if (locked.consumedAt) {
        throw new ConflictException('This fare quote has already been used for a booking.');
      }
      await tx.flightQuote.update({ where: { id: quote.id }, data: { consumedAt: new Date() } });

      const created = await tx.flightBooking.create({
        data: {
          reference: await this.nextReference(tx),
          userId,
          flightId: quote.flightId,
          fareClassId: quote.fareClassId,
          quoteId: quote.id,
          travelDate: quote.date,
          adults: quote.adults,
          children: quote.children,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'INITIATED',
          refundStatus: 'NOT_APPLICABLE',
          currency: DEMO_CURRENCY,
          totalMinor: offer.fare.price.totalMinor,
          priceSnapshot: offer.fare.price as unknown as Prisma.InputJsonValue,
          cancellationPolicySnapshot: offer.fare
            .cancellationPolicy as unknown as Prisma.InputJsonValue,
          flightSnapshot: offer.segment as unknown as Prisma.InputJsonValue,
          fareName: offer.fare.name,
          cabin: offer.fare.cabin,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          paymentDeadline: new Date(Date.now() + BOOKING_PAYMENT_WINDOW_MINUTES * 60_000),
          statusEvents: {
            create: {
              fromStatus: null,
              toStatus: 'PENDING_PAYMENT',
              note: 'Booking created and awaiting demo payment.',
              actorUserId: userId,
            },
          },
          passengers: {
            create: dto.passengers.map((passenger, position) => ({
              firstName: passenger.firstName.trim(),
              lastName: passenger.lastName.trim(),
              isLeadPassenger: Boolean(passenger.isLeadPassenger),
              position,
            })),
          },
        },
        include: FLIGHT_BOOKING_INCLUDE,
      });
      return created;
    });

    this.logger.log(`Flight booking ${booking.reference} created for ${travelDate}`);
    return toFlightBookingView(booking);
  }

  async listForUser(userId: string): Promise<FlightBookingView[]> {
    const bookings = await this.prisma.flightBooking.findMany({
      where: { userId },
      include: FLIGHT_BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return bookings.map((booking) => toFlightBookingView(booking));
  }

  async findOneForUser(idOrReference: string, userId: string): Promise<FlightBookingView> {
    return toFlightBookingView(await this.loadOwned(idOrReference, userId));
  }

  async loadOwned(idOrReference: string, userId: string): Promise<FlightBookingWithRelations> {
    const booking = await this.findRaw(idOrReference);
    if (!booking || booking.userId !== userId) {
      throw new NotFoundException('Flight booking not found.');
    }
    return booking;
  }

  async findRaw(idOrReference: string): Promise<FlightBookingWithRelations | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrReference,
    );
    return this.prisma.flightBooking.findFirst({
      where: isUuid ? { id: idOrReference } : { reference: idOrReference.toUpperCase() },
      include: FLIGHT_BOOKING_INCLUDE,
    });
  }

  /** Cancels a booking and records the refund the fare's policy produces. */
  async cancel(
    idOrReference: string,
    userId: string,
    dto: CancelFlightBookingDto,
  ): Promise<FlightBookingView> {
    const booking = await this.loadOwned(idOrReference, userId);

    if (booking.status === 'CANCELLED') {
      throw new ConflictException('This booking has already been cancelled.');
    }
    if (!canTransition(booking.status, 'CANCELLED')) {
      throw new ConflictException(`A booking that is "${booking.status}" cannot be cancelled.`);
    }

    const policy = booking.cancellationPolicySnapshot as unknown as CancellationPolicy;
    const wasPaid = booking.paymentStatus === 'SUCCEEDED';
    const outcome = evaluateCancellation({
      policy,
      totalMinor: booking.totalMinor,
      checkIn: fromDbDate(booking.travelDate),
    });

    // Nothing was paid, so nothing is refunded regardless of policy.
    const refundMinor = wasPaid ? outcome.refundMinor : 0;
    const penaltyMinor = wasPaid ? outcome.penaltyMinor : 0;
    const refundStatus = !wasPaid ? 'NOT_APPLICABLE' : refundMinor > 0 ? 'REFUNDED' : 'REJECTED';

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.flightBooking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          refundStatus,
          refundMinor: wasPaid ? refundMinor : null,
          cancelledAt: new Date(),
          statusEvents: {
            create: {
              fromStatus: booking.status,
              toStatus: 'CANCELLED',
              note: dto.reason
                ? `${outcome.reason} Customer reason: ${dto.reason}`
                : outcome.reason,
              actorUserId: userId,
            },
          },
        },
        include: FLIGHT_BOOKING_INCLUDE,
      });

      if (wasPaid) {
        await tx.flightRefund.upsert({
          where: { bookingId: booking.id },
          create: {
            bookingId: booking.id,
            status: refundStatus,
            amountMinor: refundMinor,
            penaltyMinor,
            reason: outcome.reason,
            settledAt: refundMinor > 0 ? new Date() : null,
          },
          update: {
            status: refundStatus,
            amountMinor: refundMinor,
            penaltyMinor,
            reason: outcome.reason,
            settledAt: refundMinor > 0 ? new Date() : null,
          },
        });
      }

      return row;
    });

    this.logger.log(
      `Flight booking ${updated.reference} cancelled; simulated refund ${refundMinor} minor units`,
    );
    return toFlightBookingView(updated);
  }

  /** Shared, validated status transition used by the payment simulator. */
  async transition(
    tx: TxClient,
    bookingId: string,
    from: BookingStatus,
    to: BookingStatus,
    note: string,
    actorUserId?: string,
  ): Promise<void> {
    if (!canTransition(from, to)) {
      throw new ConflictException(`Cannot move a booking from "${from}" to "${to}".`);
    }
    await tx.flightBookingStatusEvent.create({
      data: { bookingId, fromStatus: from, toStatus: to, note, actorUserId: actorUserId ?? null },
    });
  }

  private async nextReference(tx: TxClient): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reference = generateFlightReference();
      const clash = await tx.flightBooking.findUnique({ where: { reference } });
      if (!clash) return reference;
    }
    throw new ConflictException('Could not allocate a booking reference. Please retry.');
  }

  /** Guards admin-only reads that bypass the ownership check. */
  static assertAdmin(role: string): void {
    if (role !== 'ADMIN') throw new ForbiddenException('Administrator access required.');
  }
}
