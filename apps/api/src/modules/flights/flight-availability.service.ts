import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Airline, Airport, FareClass, Flight, FlightInventory } from '@prisma/client';
import {
  FLIGHT_SEARCH_LIMITS,
  arrivalOf,
  computeFarePrice,
  operatesOn,
  todayIso,
  type CabinValue,
  type CancellationPolicy,
  type FareCodeValue,
  type FareOfferView,
  type FlightOfferView,
  type FlightSegmentView,
} from '@voyago/shared';
import { toDbDate } from '../../common/utils/dates';
import { PrismaService } from '../../prisma/prisma.service';

export interface FareAvailabilityRequest {
  flightId: string;
  fareClassId: string;
  date: string;
  adults: number;
  children: number;
  /** A quote being re-read must not count its own hold against itself. */
  excludeQuoteId?: string;
}

type FlightWithRelations = Flight & {
  airline: Airline;
  origin: Airport;
  destination: Airport;
};

/**
 * The single authority on whether seats are sellable and at what price.
 * Sellable = seatsOpen - seats held by live quotes - seats on bookings that
 * still hold inventory. Both search and the quote recheck go through here.
 */
@Injectable()
export class FlightAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  assertParty(adults: number, children: number): void {
    if (adults + children > FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS) {
      throw new BadRequestException(
        `At most ${FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS} travellers per booking.`,
      );
    }
  }

  assertSearchableDate(date: string): void {
    const today = todayIso();
    if (date <= today) {
      throw new BadRequestException('Departure date must be in the future.');
    }
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + FLIGHT_SEARCH_LIMITS.MAX_ADVANCE_DAYS);
    if (new Date(`${date}T00:00:00Z`) > horizon) {
      throw new BadRequestException(
        `Flights can be booked at most ${FLIGHT_SEARCH_LIMITS.MAX_ADVANCE_DAYS} days ahead.`,
      );
    }
  }

  /** All sellable offers for a route and date. */
  async searchOffers(args: {
    fromIata: string;
    toIata: string;
    date: string;
    adults: number;
    children: number;
  }): Promise<{ origin: Airport; destination: Airport; offers: FlightOfferView[] }> {
    this.assertSearchableDate(args.date);
    this.assertParty(args.adults, args.children);

    const [origin, destination] = await Promise.all([
      this.prisma.airport.findUnique({ where: { iata: args.fromIata.toUpperCase() } }),
      this.prisma.airport.findUnique({ where: { iata: args.toIata.toUpperCase() } }),
    ]);
    if (!origin) throw new NotFoundException('Unknown origin airport.');
    if (!destination) throw new NotFoundException('Unknown destination airport.');
    if (origin.id === destination.id) {
      throw new BadRequestException('Origin and destination must differ.');
    }

    const flights = await this.prisma.flight.findMany({
      where: { originId: origin.id, destinationId: destination.id, isActive: true },
      include: {
        airline: true,
        origin: true,
        destination: true,
        fareClasses: { include: { cancellationPolicy: true } },
        inventory: { where: { date: toDbDate(args.date) } },
      },
      orderBy: { departureMinute: 'asc' },
    });

    const seats = args.adults + args.children;
    const operating = flights.filter((flight) => operatesOn(flight.daysOfWeek, args.date));

    const holdsByFare = await this.holdsFor(
      operating.map((flight) => flight.id),
      args.date,
    );

    const offers: FlightOfferView[] = [];
    for (const flight of operating) {
      const fares: FareOfferView[] = [];
      for (const fare of flight.fareClasses) {
        const inventory = flight.inventory.find((row) => row.fareClassId === fare.id);
        if (!inventory) continue;
        const held = holdsByFare.get(fare.id) ?? 0;
        const seatsLeft = Math.max(0, inventory.seatsOpen - held);
        if (seatsLeft < seats) continue;
        fares.push(this.toFareOffer(fare, inventory, seatsLeft, args.adults, args.children));
      }
      if (fares.length === 0) continue;
      fares.sort((a, b) => a.price.totalMinor - b.price.totalMinor);
      offers.push({
        segment: this.toSegment(flight, args.date),
        fares,
        leadTotalMinor: fares[0]!.price.totalMinor,
      });
    }

    return { origin, destination, offers };
  }

  /** Re-prices one fare on one flight-date; null when it cannot be sold. */
  async findFareOffer(request: FareAvailabilityRequest): Promise<{
    segment: FlightSegmentView;
    fare: FareOfferView;
    flight: FlightWithRelations;
    fareClass: FareClass & { cancellationPolicy: unknown };
  } | null> {
    this.assertParty(request.adults, request.children);
    const fare = await this.prisma.fareClass.findUnique({
      where: { id: request.fareClassId },
      include: {
        cancellationPolicy: true,
        flight: { include: { airline: true, origin: true, destination: true } },
      },
    });
    if (!fare || fare.flightId !== request.flightId || !fare.flight.isActive) return null;
    if (!operatesOn(fare.flight.daysOfWeek, request.date)) return null;

    const inventory = await this.prisma.flightInventory.findUnique({
      where: {
        flightId_fareClassId_date: {
          flightId: request.flightId,
          fareClassId: request.fareClassId,
          date: toDbDate(request.date),
        },
      },
    });
    if (!inventory) return null;

    const holds = await this.holdsFor([request.flightId], request.date, request.excludeQuoteId);
    const seatsLeft = Math.max(0, inventory.seatsOpen - (holds.get(request.fareClassId) ?? 0));
    const seats = request.adults + request.children;
    if (seatsLeft < seats) return null;

    return {
      segment: this.toSegment(fare.flight, request.date),
      fare: this.toFareOffer(fare, inventory, seatsLeft, request.adults, request.children),
      flight: fare.flight,
      fareClass: fare,
    };
  }

  /**
   * Seats currently unavailable per fare class: live quote holds plus seats on
   * bookings that still hold inventory (anything not cancelled or expired).
   */
  private async holdsFor(
    flightIds: string[],
    date: string,
    excludeQuoteId?: string,
  ): Promise<Map<string, number>> {
    if (flightIds.length === 0) return new Map();
    const dbDate = toDbDate(date);

    const [quotes, bookings] = await Promise.all([
      this.prisma.flightQuote.findMany({
        where: {
          flightId: { in: flightIds },
          date: dbDate,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          ...(excludeQuoteId ? { id: { not: excludeQuoteId } } : {}),
        },
        select: { fareClassId: true, adults: true, children: true },
      }),
      this.prisma.flightBooking.findMany({
        where: {
          flightId: { in: flightIds },
          travelDate: dbDate,
          status: { notIn: ['CANCELLED', 'EXPIRED'] },
        },
        select: { fareClassId: true, adults: true, children: true },
      }),
    ]);

    const held = new Map<string, number>();
    for (const row of [...quotes, ...bookings]) {
      held.set(row.fareClassId, (held.get(row.fareClassId) ?? 0) + row.adults + row.children);
    }
    return held;
  }

  private toSegment(flight: FlightWithRelations, date: string): FlightSegmentView {
    const arrival = arrivalOf(flight.departureMinute, flight.durationMinutes);
    return {
      flightId: flight.id,
      airline: { code: flight.airline.code, name: flight.airline.name },
      flightNumber: flight.flightNumber,
      origin: this.toAirport(flight.origin),
      destination: this.toAirport(flight.destination),
      date,
      departureMinute: flight.departureMinute,
      arrivalMinute: arrival.arrivalMinute,
      dayOffset: arrival.dayOffset,
      durationMinutes: flight.durationMinutes,
      aircraft: flight.aircraft,
    };
  }

  private toAirport(airport: Airport): { iata: string; name: string; city: string } {
    return { iata: airport.iata, name: airport.name, city: airport.city };
  }

  private toFareOffer(
    fare: FareClass & { cancellationPolicy: unknown },
    inventory: FlightInventory,
    seatsLeft: number,
    adults: number,
    children: number,
  ): FareOfferView {
    const policyRow = fare.cancellationPolicy as {
      code: string;
      name: string;
      description: string;
      refundable: boolean;
      tiers: unknown;
    };
    const policy: CancellationPolicy = {
      code: policyRow.code,
      name: policyRow.name,
      description: policyRow.description,
      refundable: policyRow.refundable,
      tiers: policyRow.tiers as CancellationPolicy['tiers'],
    };

    return {
      fareClassId: fare.id,
      code: fare.code as FareCodeValue,
      name: fare.name,
      cabin: fare.cabin as CabinValue,
      checkinBaggageKg: fare.checkinBaggageKg,
      cabinBaggageKg: fare.cabinBaggageKg,
      mealIncluded: fare.mealIncluded,
      seatSelectionIncluded: fare.seatSelectionIncluded,
      seatsLeft,
      refundable: policy.refundable,
      cancellationPolicy: policy,
      price: computeFarePrice({
        perSeatBaseMinor: inventory.baseFareMinor,
        adults,
        children,
        cabin: fare.cabin as CabinValue,
        supplementBasisPoints: fare.supplementBasisPoints,
        discountBasisPoints: fare.discountBasisPoints,
      }),
    };
  }
}
