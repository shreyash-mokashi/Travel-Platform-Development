import { Injectable } from '@nestjs/common';
import type { BookingStatus, MealPlan, Prisma } from '@prisma/client';
import {
  computePrice,
  eachStayNight,
  type CancellationPolicy,
  type HotelImage,
  type NightlyRate,
  type RoomOffer,
} from '@voyago/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { toDbDate, fromDbDate } from '../../common/utils/dates';

/** Booking states that continue to hold physical inventory. */
export const INVENTORY_HOLDING_STATUSES: BookingStatus[] = [
  'PENDING_PAYMENT',
  'PAYMENT_PROCESSING',
  'PAYMENT_FAILED',
  'CONFIRMED',
  'CANCELLATION_REQUESTED',
];

export interface OccupancyRequest {
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
}

export interface OfferLookup extends OccupancyRequest {
  hotelIds: string[];
  /** Quote whose own soft hold should be ignored when re-pricing it. */
  excludeQuoteId?: string;
}

type RoomWithRelations = Prisma.RoomGetPayload<{
  include: {
    images: true;
    ratePlans: { include: { cancellationPolicy: true } };
  };
}>;

/**
 * Computes bookable room offers. This is the single authority on whether a
 * room can be sold for a stay and at what price - the client never supplies
 * either answer.
 */
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Per-room occupancy implied by the search, rounded up across rooms. */
  static perRoomOccupancy(request: OccupancyRequest): { adults: number; children: number } {
    return {
      adults: Math.ceil(request.adults / request.rooms),
      children: Math.ceil(request.children / request.rooms),
    };
  }

  async getOffersByHotel(lookup: OfferLookup): Promise<Map<string, RoomOffer[]>> {
    const result = new Map<string, RoomOffer[]>();
    if (lookup.hotelIds.length === 0) return result;

    const nights = eachStayNight(lookup.checkIn, lookup.checkOut);
    if (nights.length === 0) return result;

    const occupancy = AvailabilityService.perRoomOccupancy(lookup);

    const rooms = await this.prisma.room.findMany({
      where: {
        hotelId: { in: lookup.hotelIds },
        isActive: true,
        maxAdults: { gte: occupancy.adults },
        maxChildren: { gte: occupancy.children },
        maxOccupancy: { gte: occupancy.adults + occupancy.children },
      },
      include: {
        images: { orderBy: { position: 'asc' } },
        ratePlans: { where: { isActive: true }, include: { cancellationPolicy: true } },
      },
      orderBy: { maxOccupancy: 'asc' },
    });

    if (rooms.length === 0) return result;
    const roomIds = rooms.map((room) => room.id);

    const [inventoryByRoomDate, consumedByRoomDate] = await Promise.all([
      this.loadInventory(roomIds, nights),
      this.loadConsumedInventory(roomIds, lookup),
    ]);

    for (const room of rooms) {
      const offers = this.buildRoomOffers(
        room,
        nights,
        lookup.rooms,
        inventoryByRoomDate,
        consumedByRoomDate,
      );
      if (offers.length === 0) continue;
      const existing = result.get(room.hotelId) ?? [];
      result.set(room.hotelId, [...existing, ...offers]);
    }

    return result;
  }

  async getOffersForHotel(
    hotelId: string,
    request: OccupancyRequest & { excludeQuoteId?: string },
  ): Promise<RoomOffer[]> {
    const byHotel = await this.getOffersByHotel({ ...request, hotelIds: [hotelId] });
    return byHotel.get(hotelId) ?? [];
  }

  /** Resolves one specific room + rate plan combination, or null. */
  async findOffer(args: {
    hotelId: string;
    roomId: string;
    ratePlanId: string;
    request: OccupancyRequest & { excludeQuoteId?: string };
  }): Promise<RoomOffer | null> {
    const offers = await this.getOffersForHotel(args.hotelId, args.request);
    return (
      offers.find(
        (offer) => offer.roomId === args.roomId && offer.ratePlan.id === args.ratePlanId,
      ) ?? null
    );
  }

  private async loadInventory(
    roomIds: string[],
    nights: string[],
  ): Promise<Map<string, { roomsOpen: number; baseRateMinor: number }>> {
    const rows = await this.prisma.roomInventory.findMany({
      where: { roomId: { in: roomIds }, date: { in: nights.map(toDbDate) } },
    });
    const map = new Map<string, { roomsOpen: number; baseRateMinor: number }>();
    for (const row of rows) {
      map.set(`${row.roomId}|${fromDbDate(row.date)}`, {
        roomsOpen: row.roomsOpen,
        baseRateMinor: row.baseRateMinor,
      });
    }
    return map;
  }

  /**
   * Inventory already taken for each room/night: confirmed and in-flight
   * bookings plus unexpired quote holds.
   */
  private async loadConsumedInventory(
    roomIds: string[],
    lookup: OfferLookup,
  ): Promise<Map<string, number>> {
    const stayStart = toDbDate(lookup.checkIn);
    const stayEnd = toDbDate(lookup.checkOut);
    const consumed = new Map<string, number>();

    const add = (roomId: string, checkIn: Date, checkOut: Date, rooms: number) => {
      for (const night of eachStayNight(fromDbDate(checkIn), fromDbDate(checkOut))) {
        const key = `${roomId}|${night}`;
        consumed.set(key, (consumed.get(key) ?? 0) + rooms);
      }
    };

    const [bookings, holds] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          roomId: { in: roomIds },
          status: { in: INVENTORY_HOLDING_STATUSES },
          checkIn: { lt: stayEnd },
          checkOut: { gt: stayStart },
        },
        select: { roomId: true, checkIn: true, checkOut: true, rooms: true },
      }),
      this.prisma.quote.findMany({
        where: {
          roomId: { in: roomIds },
          consumedAt: null,
          expiresAt: { gt: new Date() },
          checkIn: { lt: stayEnd },
          checkOut: { gt: stayStart },
          ...(lookup.excludeQuoteId ? { id: { not: lookup.excludeQuoteId } } : {}),
        },
        select: { roomId: true, checkIn: true, checkOut: true, rooms: true },
      }),
    ]);

    for (const booking of bookings) {
      add(booking.roomId, booking.checkIn, booking.checkOut, booking.rooms);
    }
    for (const hold of holds) {
      add(hold.roomId, hold.checkIn, hold.checkOut, hold.rooms);
    }

    return consumed;
  }

  private buildRoomOffers(
    room: RoomWithRelations,
    nights: string[],
    roomsRequested: number,
    inventory: Map<string, { roomsOpen: number; baseRateMinor: number }>,
    consumed: Map<string, number>,
  ): RoomOffer[] {
    const nightlyRates: NightlyRate[] = [];
    let roomsAvailable = Number.POSITIVE_INFINITY;

    for (const night of nights) {
      const row = inventory.get(`${room.id}|${night}`);
      if (!row) return [];
      const free = row.roomsOpen - (consumed.get(`${room.id}|${night}`) ?? 0);
      if (free < roomsRequested) return [];
      roomsAvailable = Math.min(roomsAvailable, free);
      nightlyRates.push({ date: night, amountMinor: row.baseRateMinor });
    }

    const images: HotelImage[] = room.images.map((image) => ({
      url: image.url,
      alt: image.alt,
      position: image.position,
    }));

    return room.ratePlans.map((ratePlan) => {
      const policy = AvailabilityService.toCancellationPolicy(ratePlan.cancellationPolicy);
      const price = computePrice({
        nightlyRates,
        rooms: roomsRequested,
        discountBasisPoints: ratePlan.discountBasisPoints,
        supplementBasisPoints: ratePlan.supplementBasisPoints,
      });

      return {
        roomId: room.id,
        roomName: room.name,
        roomDescription: room.description,
        maxAdults: room.maxAdults,
        maxChildren: room.maxChildren,
        maxOccupancy: room.maxOccupancy,
        sizeSqm: room.sizeSqm,
        bedType: room.bedType,
        images,
        amenities: room.amenities,
        ratePlan: {
          id: ratePlan.id,
          code: ratePlan.code,
          name: ratePlan.name,
          mealPlan: ratePlan.mealPlan as MealPlan,
          description: ratePlan.description,
          discountBasisPoints: ratePlan.discountBasisPoints,
          supplementBasisPoints: ratePlan.supplementBasisPoints,
          cancellationPolicy: policy,
        },
        roomsAvailable: Number.isFinite(roomsAvailable) ? roomsAvailable : 0,
        price,
      } satisfies RoomOffer;
    });
  }

  static toCancellationPolicy(row: {
    code: string;
    name: string;
    description: string;
    refundable: boolean;
    tiers: Prisma.JsonValue;
  }): CancellationPolicy {
    return {
      code: row.code,
      name: row.name,
      description: row.description,
      refundable: row.refundable,
      tiers: (row.tiers as unknown as CancellationPolicy['tiers']) ?? [],
    };
  }
}
