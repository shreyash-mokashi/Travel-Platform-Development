import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { BookingStatus, Prisma, PrismaClient } from '@prisma/client';
import {
  BOOKING_PAYMENT_WINDOW_MINUTES,
  DEMO_CURRENCY,
  canTransition,
  evaluateCancellation,
  nightsBetween,
  type BookingView,
  type CancellationPolicy,
  type Paginated,
} from '@voyago/shared';
import { generateBookingReference } from '../../common/utils/reference';
import { fromDbDate } from '../../common/utils/dates';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { QuotesService } from '../availability/quotes.service';
import { ContentService } from '../content/content.service';
import { BOOKING_INCLUDE, toBookingView, type BookingWithRelations } from './booking.mapper';
import type { BookingListQueryDto, CancelBookingDto, CreateBookingDto } from './dto/booking.dto';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly quotes: QuotesService,
    private readonly content: ContentService,
  ) {}

  /**
   * Creates a pending booking from a server-issued quote. The quote is
   * repriced and consumed inside one transaction so a replayed request cannot
   * produce two bookings from the same hold.
   */
  async create(dto: CreateBookingDto, userId: string): Promise<BookingView> {
    if (!dto.acceptedCancellationPolicy) {
      throw new BadRequestException('Please accept the cancellation policy to continue.');
    }
    if (!dto.guests.some((guest) => guest.isLeadGuest)) {
      dto.guests[0]!.isLeadGuest = true;
    }
    if (dto.guests.filter((guest) => guest.isLeadGuest).length > 1) {
      throw new BadRequestException('Only one guest can be the lead guest.');
    }

    const quote = await this.quotes.loadQuote(dto.quoteId, userId);
    if (quote.consumedAt) {
      // The quote is single-use; surface the booking it already produced.
      const existing = await this.prisma.booking.findUnique({
        where: { quoteId: quote.id },
        include: BOOKING_INCLUDE,
      });
      if (existing && existing.userId === userId) return toBookingView(existing);
      throw new ConflictException('This price quote has already been used for a booking.');
    }
    if (quote.expiresAt <= new Date()) {
      throw new BadRequestException(
        'Your price hold has expired. Please search again to see current prices.',
      );
    }

    const checkIn = fromDbDate(quote.checkIn);
    const checkOut = fromDbDate(quote.checkOut);

    // Authoritative recheck: never trust anything the client sent about price.
    const offer = await this.availability.findOffer({
      hotelId: quote.hotelId,
      roomId: quote.roomId,
      ratePlanId: quote.ratePlanId,
      request: {
        checkIn,
        checkOut,
        rooms: quote.rooms,
        adults: quote.adults,
        children: quote.children,
        excludeQuoteId: quote.id,
      },
    });

    if (!offer) {
      throw new ConflictException(
        'That room sold out while you were booking. Please choose another option.',
      );
    }

    const hotel = await this.prisma.hotel.findUniqueOrThrow({
      where: { id: quote.hotelId },
      include: { images: { orderBy: { position: 'asc' } }, destination: true },
    });

    const hotelSnapshot = {
      id: hotel.id,
      slug: hotel.slug,
      name: hotel.name,
      starRating: hotel.starRating,
      addressLine: hotel.addressLine,
      locality: hotel.locality,
      city: hotel.destination.city,
      state: hotel.destination.state,
      checkInTime: hotel.checkInTime,
      checkOutTime: hotel.checkOutTime,
      phone: hotel.phone,
      imageUrl: hotel.images[0]?.url ?? null,
    };

    const booking = await this.prisma.$transaction(async (tx) => {
      // Re-read the quote inside the transaction to close the race window.
      const locked = await tx.quote.findUniqueOrThrow({ where: { id: quote.id } });
      if (locked.consumedAt) {
        throw new ConflictException('This price quote has already been used for a booking.');
      }
      await tx.quote.update({ where: { id: quote.id }, data: { consumedAt: new Date() } });

      const created = await tx.booking.create({
        data: {
          reference: await this.nextReference(tx),
          userId,
          hotelId: hotel.id,
          roomId: quote.roomId,
          ratePlanId: quote.ratePlanId,
          destinationId: hotel.destinationId,
          quoteId: quote.id,
          checkIn: quote.checkIn,
          checkOut: quote.checkOut,
          nights: nightsBetween(checkIn, checkOut),
          rooms: quote.rooms,
          adults: quote.adults,
          children: quote.children,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'INITIATED',
          refundStatus: 'NOT_APPLICABLE',
          currency: DEMO_CURRENCY,
          totalMinor: offer.price.totalMinor,
          priceSnapshot: offer.price as unknown as Prisma.InputJsonValue,
          cancellationPolicySnapshot: offer.ratePlan
            .cancellationPolicy as unknown as Prisma.InputJsonValue,
          hotelSnapshot: hotelSnapshot as unknown as Prisma.InputJsonValue,
          roomName: offer.roomName,
          ratePlanName: offer.ratePlan.name,
          mealPlan: offer.ratePlan.mealPlan,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          specialRequests: dto.specialRequests || null,
          paymentDeadline: new Date(Date.now() + BOOKING_PAYMENT_WINDOW_MINUTES * 60_000),
          guests: {
            create: dto.guests.map((guest, index) => ({
              firstName: guest.firstName,
              lastName: guest.lastName,
              isLeadGuest: guest.isLeadGuest,
              position: index,
            })),
          },
          statusEvents: {
            create: {
              fromStatus: null,
              toStatus: 'PENDING_PAYMENT',
              note: 'Booking created and awaiting demo payment.',
              actorUserId: userId,
            },
          },
        },
        include: BOOKING_INCLUDE,
      });

      return created;
    });

    await this.content.recordSnapshot({
      correlationId: booking.id,
      kind: 'BOOKING',
      hotelId: hotel.id,
      roomId: quote.roomId,
      ratePlanId: quote.ratePlanId,
      checkIn,
      checkOut,
      totalMinor: offer.price.totalMinor,
      payload: { reference: booking.reference, offer } as unknown as Record<string, unknown>,
    });

    this.logger.log(`Booking ${booking.reference} created for user ${userId}`);
    return toBookingView(booking);
  }

  async listForUser(userId: string, query: BookingListQueryDto): Promise<Paginated<BookingView>> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
    const where: Prisma.BookingWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: rows.map((row) => toBookingView(row)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  /**
   * Loads a booking by id or reference. Ownership is enforced here rather
   * than in the controller so every caller is covered.
   */
  async findOneForUser(idOrReference: string, userId: string): Promise<BookingView> {
    const booking = await this.loadOwned(idOrReference, userId);
    return toBookingView(booking);
  }

  async loadOwned(idOrReference: string, userId: string): Promise<BookingWithRelations> {
    const booking = await this.findRaw(idOrReference);
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.userId !== userId) {
      // Deliberately a 404, so booking references cannot be probed.
      throw new NotFoundException('Booking not found.');
    }
    return booking;
  }

  async findRaw(idOrReference: string): Promise<BookingWithRelations | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrReference,
    );
    return this.prisma.booking.findFirst({
      where: isUuid ? { id: idOrReference } : { reference: idOrReference.toUpperCase() },
      include: BOOKING_INCLUDE,
    });
  }

  /** Cancels a booking and records the refund the seeded policy produces. */
  async cancel(idOrReference: string, userId: string, dto: CancelBookingDto): Promise<BookingView> {
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
      checkIn: fromDbDate(booking.checkIn),
    });

    // Nothing was paid, so nothing is refunded regardless of policy.
    const refundMinor = wasPaid ? outcome.refundMinor : 0;
    const penaltyMinor = wasPaid ? outcome.penaltyMinor : 0;
    const refundStatus = !wasPaid ? 'NOT_APPLICABLE' : refundMinor > 0 ? 'REFUNDED' : 'REJECTED';

    const updated = await this.prisma.$transaction(async (tx) => {
      const booking2 = await tx.booking.update({
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
        include: BOOKING_INCLUDE,
      });

      if (wasPaid) {
        await tx.refund.upsert({
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

      return booking2;
    });

    this.logger.log(
      `Booking ${updated.reference} cancelled; simulated refund ${refundMinor} minor units`,
    );
    return toBookingView(updated);
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
    await tx.bookingStatusEvent.create({
      data: { bookingId, fromStatus: from, toStatus: to, note, actorUserId: actorUserId ?? null },
    });
  }

  private async nextReference(tx: TxClient): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reference = generateBookingReference();
      const clash = await tx.booking.findUnique({ where: { reference } });
      if (!clash) return reference;
    }
    throw new ConflictException('Could not allocate a booking reference. Please retry.');
  }

  /** Guards admin-only reads that bypass the ownership check. */
  static assertAdmin(role: string): void {
    if (role !== 'ADMIN') throw new ForbiddenException('Administrator access required.');
  }
}
