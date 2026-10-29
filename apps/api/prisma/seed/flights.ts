import type { Prisma, PrismaClient } from '@prisma/client';
import { EVERY_DAY, addDays, toMinorUnits } from '@voyago/shared';
import { createRandom } from './random';

/**
 * Demo flight network between the six seeded cities. Every airline, code and
 * schedule here is fictional; no real carrier, fare or availability is
 * represented. The construction is deterministic (seeded PRNG), so repeated
 * seeds produce identical data.
 */

export const FLIGHT_CANCELLATION_POLICIES = [
  {
    code: 'FLIGHT_NONREF',
    name: 'Non-refundable fare',
    description:
      'The fare is not refunded on cancellation. Only the convenience fee portion of ' +
      'applicable taxes may be returned by a real airline; this demo retains the full amount.',
    refundable: false,
    tiers: [],
  },
  {
    code: 'FLIGHT_STANDARD',
    name: 'Standard airline cancellation',
    description:
      'Cancel more than 72 hours before departure and 70% is refunded. Between 72 and 24 ' +
      'hours half is retained. Within 24 hours of departure 85% is retained.',
    refundable: true,
    tiers: [
      {
        hoursBeforeCheckIn: 72,
        penaltyBasisPoints: 3_000,
        label: 'Cancelled more than 72 hours before departure: 30% retained.',
      },
      {
        hoursBeforeCheckIn: 24,
        penaltyBasisPoints: 5_000,
        label: 'Cancelled 24-72 hours before departure: 50% retained.',
      },
      {
        hoursBeforeCheckIn: 0,
        penaltyBasisPoints: 8_500,
        label: 'Cancelled within 24 hours of departure: 85% retained.',
      },
    ],
  },
  {
    code: 'FLIGHT_FLEX',
    name: 'Flexible - free cancellation until 24 hours before departure',
    description:
      'Cancel at least 24 hours before departure for a full refund. Within 24 hours a ' +
      'quarter of the fare is retained.',
    refundable: true,
    tiers: [
      {
        hoursBeforeCheckIn: 24,
        penaltyBasisPoints: 0,
        label: 'Cancelled more than 24 hours before departure: full refund.',
      },
      {
        hoursBeforeCheckIn: 0,
        penaltyBasisPoints: 2_500,
        label: 'Cancelled within 24 hours of departure: 25% retained.',
      },
    ],
  },
] as const;

export const AIRLINES = [
  { code: 'ZV', name: 'Zephyr Airways' },
  { code: 'MW', name: 'Monsoon Wings' },
  { code: 'DJ', name: 'Deccan Jet' },
  { code: 'KT', name: 'Kite Air' },
] as const;

export const AIRPORTS = [
  { iata: 'BOM', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', slug: 'mumbai', latitude: 19.0896, longitude: 72.8656 },
  { iata: 'PNQ', name: 'Pune Airport', city: 'Pune', slug: 'pune', latitude: 18.5793, longitude: 73.9089 },
  { iata: 'GOI', name: 'Goa Dabolim', city: 'Goa', slug: 'goa', latitude: 15.3808, longitude: 73.8314 },
  { iata: 'BLR', name: 'Kempegowda International', city: 'Bengaluru', slug: 'bengaluru', latitude: 13.1989, longitude: 77.7068 },
  { iata: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', slug: 'new-delhi', latitude: 28.5562, longitude: 77.1 },
  { iata: 'JAI', name: 'Jaipur International', city: 'Jaipur', slug: 'jaipur', latitude: 26.8242, longitude: 75.8122 },
] as const;

/**
 * City pairs served, with block time and a saver base-fare band per seat in
 * rupees. Both directions are generated. Mumbai-Pune is deliberately absent:
 * nobody flies a 25-minute hop the train does better.
 */
const ROUTES = [
  { from: 'BOM', to: 'GOI', minutes: 75, fare: [3_000, 4_400], flights: 3, business: true },
  { from: 'BOM', to: 'DEL', minutes: 130, fare: [4_400, 7_200], flights: 3, business: true },
  { from: 'BOM', to: 'BLR', minutes: 105, fare: [3_600, 5_800], flights: 3, business: true },
  { from: 'BOM', to: 'JAI', minutes: 110, fare: [3_900, 6_100], flights: 2, business: false },
  { from: 'DEL', to: 'GOI', minutes: 155, fare: [5_200, 8_400], flights: 2, business: true },
  { from: 'DEL', to: 'BLR', minutes: 165, fare: [5_400, 8_800], flights: 3, business: true },
  { from: 'DEL', to: 'JAI', minutes: 65, fare: [2_800, 4_000], flights: 2, business: false },
  { from: 'DEL', to: 'PNQ', minutes: 125, fare: [4_300, 6_900], flights: 2, business: false },
  { from: 'BLR', to: 'GOI', minutes: 80, fare: [3_100, 4_600], flights: 2, business: false },
  { from: 'BLR', to: 'PNQ', minutes: 95, fare: [3_400, 5_200], flights: 2, business: false },
] as const;

const AIRCRAFT = ['A320neo', 'B737-8', 'A321', 'ATR 72-600'] as const;

const DEPARTURE_BANDS = [
  [355, 480], // early morning
  [500, 690], // morning
  [700, 930], // midday
  [960, 1_170], // evening
  [1_180, 1_320], // night
] as const;

export interface FlightSeedSummary {
  airports: number;
  airlines: number;
  flights: number;
  fareClasses: number;
  inventoryRows: number;
}

export async function seedFlights(
  prisma: PrismaClient,
  policyIds: Map<string, string>,
  inventoryDays: number,
): Promise<FlightSeedSummary> {
  const random = createRandom(20_261_029);

  const airlineIds = new Map<string, string>();
  for (const airline of AIRLINES) {
    const row = await prisma.airline.create({ data: airline });
    airlineIds.set(airline.code, row.id);
  }

  const destinationRows = await prisma.destination.findMany({ select: { id: true, slug: true } });
  const destinationBySlug = new Map(destinationRows.map((row) => [row.slug, row.id]));

  const airportIds = new Map<string, string>();
  for (const airport of AIRPORTS) {
    const row = await prisma.airport.create({
      data: {
        iata: airport.iata,
        name: airport.name,
        city: airport.city,
        destinationId: destinationBySlug.get(airport.slug) ?? null,
        latitude: airport.latitude,
        longitude: airport.longitude,
      },
    });
    airportIds.set(airport.iata, row.id);
  }

  const nonref = policyIds.get('FLIGHT_NONREF');
  const standard = policyIds.get('FLIGHT_STANDARD');
  const flex = policyIds.get('FLIGHT_FLEX');
  if (!nonref || !standard || !flex) {
    throw new Error('flight cancellation policies must be seeded first');
  }

  let flights = 0;
  let fareClasses = 0;
  const inventory: Prisma.FlightInventoryCreateManyInput[] = [];
  const start = new Date();

  const usedNumbers = new Set<string>();

  for (const route of ROUTES) {
    for (const [from, to] of [
      [route.from, route.to],
      [route.to, route.from],
    ] as const) {
      const bands = random.sample(DEPARTURE_BANDS, route.flights);
      for (const band of bands) {
        const airline = random.pick(AIRLINES);
        let flightNumber: string;
        do {
          flightNumber = `${airline.code} ${random.int(101, 989)}`;
        } while (usedNumbers.has(flightNumber));
        usedNumbers.add(flightNumber);

        // A couple of services skip one weekday to exercise the bitmask path.
        const skipsADay = random.next() < 0.2;
        const daysOfWeek = skipsADay ? EVERY_DAY & ~(1 << random.int(0, 6)) : EVERY_DAY;

        const flight = await prisma.flight.create({
          data: {
            airlineId: airlineIds.get(airline.code)!,
            flightNumber,
            originId: airportIds.get(from)!,
            destinationId: airportIds.get(to)!,
            departureMinute: random.int(band[0], band[1]),
            durationMinutes: route.minutes + random.int(-5, 10),
            aircraft: random.pick(AIRCRAFT),
            daysOfWeek,
          },
        });
        flights += 1;

        const fares = [
          {
            code: 'SAVER' as const,
            name: 'Saver',
            cabin: 'ECONOMY' as const,
            checkinBaggageKg: 15,
            cabinBaggageKg: 7,
            mealIncluded: false,
            seatSelectionIncluded: false,
            supplementBasisPoints: 0,
            discountBasisPoints: 0,
            cancellationPolicyId: nonref,
            seats: () => random.int(6, 24),
          },
          {
            code: 'FLEXI' as const,
            name: 'Flexi',
            cabin: 'ECONOMY' as const,
            checkinBaggageKg: 25,
            cabinBaggageKg: 7,
            mealIncluded: true,
            seatSelectionIncluded: true,
            supplementBasisPoints: random.int(1_800, 2_600),
            discountBasisPoints: 0,
            cancellationPolicyId: random.next() < 0.5 ? flex : standard,
            seats: () => random.int(4, 14),
          },
          ...(route.business
            ? [
                {
                  code: 'BUSINESS' as const,
                  name: 'Business',
                  cabin: 'BUSINESS' as const,
                  checkinBaggageKg: 35,
                  cabinBaggageKg: 10,
                  mealIncluded: true,
                  seatSelectionIncluded: true,
                  supplementBasisPoints: random.int(16_000, 22_000),
                  discountBasisPoints: 0,
                  cancellationPolicyId: flex,
                  seats: () => random.int(2, 8),
                },
              ]
            : []),
        ];

        for (const fare of fares) {
          const { seats, ...fareData } = fare;
          const fareRow = await prisma.fareClass.create({
            data: { ...fareData, flightId: flight.id },
          });
          fareClasses += 1;

          for (let dayOffset = 1; dayOffset <= inventoryDays; dayOffset += 1) {
            const date = addDays(toIso(start), dayOffset);
            const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
            const weekendBump = weekday === 5 || weekday === 6 || weekday === 0 ? 1.18 : 1;
            const wobble = 0.92 + random.next() * 0.2;
            const demandRamp = 1 + Math.max(0, (45 - dayOffset) / 45) * 0.35;
            const perSeatRupees = Math.round(
              random.int(route.fare[0], route.fare[1]) * weekendBump * wobble * demandRamp,
            );
            const soldOut = random.next() < 0.02;

            inventory.push({
              flightId: flight.id,
              fareClassId: fareRow.id,
              date: new Date(`${date}T00:00:00Z`),
              seatsOpen: soldOut ? 0 : seats(),
              baseFareMinor: toMinorUnits(perSeatRupees),
            });
          }
        }
      }
    }
  }

  for (let index = 0; index < inventory.length; index += 5_000) {
    await prisma.flightInventory.createMany({ data: inventory.slice(index, index + 5_000) });
  }

  return {
    airports: AIRPORTS.length,
    airlines: AIRLINES.length,
    flights,
    fareClasses,
    inventoryRows: inventory.length,
  };
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
