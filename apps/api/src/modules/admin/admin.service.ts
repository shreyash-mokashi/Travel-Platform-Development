import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { eachStayNight, type Paginated } from '@voyago/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { toDbDate } from '../../common/utils/dates';
import { ContentService } from '../content/content.service';
import { BOOKING_INCLUDE, toBookingView } from '../bookings/booking.mapper';
import type {
  AdminAuditQueryDto,
  AdminBookingQueryDto,
  UpdateInventoryDto,
  UpdateRatePlanDto,
  UpdateRoomDto,
  UpsertHotelDto,
} from './dto/admin.dto';

/** Every figure returned here is computed from the database, never hardcoded. */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
  ) {}

  async overview() {
    const [statusGroups, paymentGroups, revenue, refunds, counts, recent, snapshotCount] =
      await Promise.all([
        this.prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.booking.groupBy({ by: ['paymentStatus'], _count: { _all: true } }),
        this.prisma.booking.aggregate({
          where: { status: 'CONFIRMED' },
          _sum: { totalMinor: true },
          _count: { _all: true },
        }),
        this.prisma.refund.aggregate({
          where: { status: 'REFUNDED' },
          _sum: { amountMinor: true },
          _count: { _all: true },
        }),
        Promise.all([
          this.prisma.hotel.count({ where: { isActive: true } }),
          this.prisma.room.count({ where: { isActive: true } }),
          this.prisma.destination.count({ where: { isActive: true } }),
          this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
        ]),
        this.prisma.booking.findMany({
          include: BOOKING_INCLUDE,
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
        this.content.countSnapshots(),
      ]);

    const [hotels, rooms, destinations, customers] = counts;

    return {
      bookingsByStatus: statusGroups.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      paymentsByStatus: paymentGroups.map((row) => ({
        status: row.paymentStatus,
        count: row._count._all,
      })),
      confirmedBookings: revenue._count._all,
      confirmedRevenueMinor: revenue._sum.totalMinor ?? 0,
      refundedBookings: refunds._count._all,
      refundedAmountMinor: refunds._sum.amountMinor ?? 0,
      inventory: { hotels, rooms, destinations },
      customers,
      supplierSnapshots: snapshotCount,
      recentBookings: recent.map((row) => toBookingView(row)),
    };
  }

  async listBookings(
    query: AdminBookingQueryDto,
  ): Promise<Paginated<ReturnType<typeof toBookingView>>> {
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.hotelId ? { hotelId: query.hotelId } : {}),
      ...(query.q
        ? {
            OR: [
              { reference: { contains: query.q.toUpperCase() } },
              { contactEmail: { contains: query.q, mode: 'insensitive' as const } },
              { hotel: { name: { contains: query.q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: rows.map((row) => toBookingView(row)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async getBooking(idOrReference: string) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(idOrReference);
    const booking = await this.prisma.booking.findFirst({
      where: isUuid ? { id: idOrReference } : { reference: idOrReference.toUpperCase() },
      include: BOOKING_INCLUDE,
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    return toBookingView(booking);
  }

  async listHotels(page = 1, pageSize = 20) {
    const [rows, total] = await Promise.all([
      this.prisma.hotel.findMany({
        include: {
          destination: true,
          images: { orderBy: { position: 'asc' }, take: 1 },
          _count: { select: { rooms: true, bookings: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.hotel.count(),
    ]);

    return {
      items: rows.map((hotel) => ({
        id: hotel.id,
        slug: hotel.slug,
        name: hotel.name,
        starRating: hotel.starRating,
        guestRating: Number(hotel.guestRating),
        city: hotel.destination.city,
        state: hotel.destination.state,
        locality: hotel.locality,
        amenities: hotel.amenities,
        isActive: hotel.isActive,
        imageUrl: hotel.images[0]?.url ?? null,
        roomCount: hotel._count.rooms,
        bookingCount: hotel._count.bookings,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getHotelInventory(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        destination: true,
        rooms: {
          include: {
            ratePlans: { include: { cancellationPolicy: true } },
            inventory: { orderBy: { date: 'asc' }, take: 30 },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!hotel) throw new NotFoundException('Hotel not found.');

    return {
      id: hotel.id,
      slug: hotel.slug,
      name: hotel.name,
      isActive: hotel.isActive,
      starRating: hotel.starRating,
      city: hotel.destination.city,
      rooms: hotel.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        description: room.description,
        totalRooms: room.totalRooms,
        maxOccupancy: room.maxOccupancy,
        isActive: room.isActive,
        ratePlans: room.ratePlans.map((plan) => ({
          id: plan.id,
          code: plan.code,
          name: plan.name,
          mealPlan: plan.mealPlan,
          discountBasisPoints: plan.discountBasisPoints,
          supplementBasisPoints: plan.supplementBasisPoints,
          isActive: plan.isActive,
          cancellationPolicy: plan.cancellationPolicy.name,
          refundable: plan.cancellationPolicy.refundable,
        })),
        inventory: room.inventory.map((row) => ({
          date: row.date.toISOString().slice(0, 10),
          roomsOpen: row.roomsOpen,
          baseRateMinor: row.baseRateMinor,
        })),
      })),
    };
  }

  async updateHotel(hotelId: string, dto: Partial<UpsertHotelDto>, actorUserId: string) {
    const hotel = await this.prisma.hotel.update({
      where: { id: hotelId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.starRating !== undefined ? { starRating: dto.starRating } : {}),
        ...(dto.addressLine !== undefined ? { addressLine: dto.addressLine } : {}),
        ...(dto.locality !== undefined ? { locality: dto.locality } : {}),
        ...(dto.shortDescription !== undefined ? { shortDescription: dto.shortDescription } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.amenities !== undefined ? { amenities: dto.amenities } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    await this.audit(actorUserId, 'HOTEL_UPDATED', 'Hotel', hotelId, dto);
    return hotel;
  }

  async updateRoom(roomId: string, dto: UpdateRoomDto, actorUserId: string) {
    const room = await this.prisma.room.update({ where: { id: roomId }, data: { ...dto } });
    await this.audit(actorUserId, 'ROOM_UPDATED', 'Room', roomId, dto);
    return room;
  }

  async updateRatePlan(ratePlanId: string, dto: UpdateRatePlanDto, actorUserId: string) {
    const plan = await this.prisma.ratePlan.update({
      where: { id: ratePlanId },
      data: { ...dto },
    });
    await this.audit(actorUserId, 'RATE_PLAN_UPDATED', 'RatePlan', ratePlanId, dto);
    return plan;
  }

  /** Bulk edits availability and tariff over a date range. */
  async updateInventory(roomId: string, dto: UpdateInventoryDto, actorUserId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found.');

    const dates = eachStayNight(dto.fromDate, dto.toDate);
    if (dates.length === 0) {
      return { updated: 0, message: 'No dates fall inside that range.' };
    }

    await this.prisma.$transaction(
      dates.map((date) =>
        this.prisma.roomInventory.upsert({
          where: { roomId_date: { roomId, date: toDbDate(date) } },
          create: {
            roomId,
            date: toDbDate(date),
            roomsOpen: dto.roomsOpen ?? room.totalRooms,
            baseRateMinor: dto.baseRateMinor ?? 0,
          },
          update: {
            ...(dto.roomsOpen !== undefined ? { roomsOpen: dto.roomsOpen } : {}),
            ...(dto.baseRateMinor !== undefined ? { baseRateMinor: dto.baseRateMinor } : {}),
          },
        }),
      ),
    );

    await this.audit(actorUserId, 'INVENTORY_UPDATED', 'Room', roomId, {
      ...dto,
      nights: dates.length,
    });

    return { updated: dates.length, message: `Updated ${dates.length} night(s).` };
  }

  async listRefunds(page = 1, pageSize = 20) {
    const [rows, total] = await Promise.all([
      this.prisma.refund.findMany({
        include: { booking: { select: { reference: true, contactEmail: true, status: true } } },
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.refund.count(),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        bookingReference: row.booking.reference,
        contactEmail: row.booking.contactEmail,
        bookingStatus: row.booking.status,
        status: row.status,
        amountMinor: row.amountMinor,
        penaltyMinor: row.penaltyMinor,
        reason: row.reason,
        requestedAt: row.requestedAt.toISOString(),
        settledAt: row.settledAt?.toISOString() ?? null,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async listAudit(query: AdminAuditQueryDto) {
    const [rows, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        include: { actor: { select: { email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.adminAuditLog.count(),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: row.metadata,
        actor: row.actor ? `${row.actor.firstName} ${row.actor.lastName}` : 'System',
        actorEmail: row.actor?.email ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  private async audit(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: unknown,
  ): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
