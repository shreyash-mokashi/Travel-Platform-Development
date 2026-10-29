/**
 * Additive flight seeder.
 *
 * `prisma db seed` truncates every table, which is right for a fresh local
 * stack and wrong for an environment that already holds demo bookings people
 * have made. This script touches only the flight tables: it clears them, makes
 * sure the three flight cancellation policies exist, and rebuilds the network.
 * Hotels, users, existing bookings and Mongo content are left alone.
 *
 *   pnpm --filter @voyago/api db:seed:flights
 *
 * It is re-runnable. Existing flight bookings are deleted along with their
 * flights, so do not run it against an environment whose flight bookings
 * matter.
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { FLIGHT_CANCELLATION_POLICIES, seedFlights } from './seed/flights';

const prisma = new PrismaClient();
const INVENTORY_DAYS = 240;

async function main(): Promise<void> {
  console.log('Seeding Voyago demo flights (hotel data is left untouched)...');

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      flight_refunds, flight_booking_status_events, flight_payment_attempts,
      flight_passengers, flight_bookings, flight_quotes, flight_inventory,
      fare_classes, flights, airports, airlines
    RESTART IDENTITY CASCADE
  `);
  console.log('  - cleared existing flight data');

  const policyIds = new Map<string, string>();
  for (const policy of FLIGHT_CANCELLATION_POLICIES) {
    const row = await prisma.cancellationPolicy.upsert({
      where: { code: policy.code },
      create: {
        code: policy.code,
        name: policy.name,
        description: policy.description,
        refundable: policy.refundable,
        tiers: policy.tiers as unknown as Prisma.InputJsonValue,
      },
      update: {
        name: policy.name,
        description: policy.description,
        refundable: policy.refundable,
        tiers: policy.tiers as unknown as Prisma.InputJsonValue,
      },
    });
    policyIds.set(policy.code, row.id);
  }
  console.log(`  - ensured ${policyIds.size} flight cancellation policies`);

  const counts = await seedFlights(prisma, policyIds, INVENTORY_DAYS);
  console.log(
    `  - created ${counts.airlines} airlines, ${counts.airports} airports, ` +
      `${counts.flights} flights, ${counts.fareClasses} fare classes, ` +
      `${counts.inventoryRows} flight inventory rows`,
  );
  console.log('Every airline is fictional and all availability is demo data.\n');
}

main()
  .catch((error) => {
    console.error('Flight seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
