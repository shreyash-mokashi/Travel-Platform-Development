/**
 * Seeds the Voyago demo dataset into PostgreSQL and MongoDB.
 *
 * Everything created here is synthetic demo inventory. Hotel names, ratings,
 * descriptions and prices are invented for this portfolio project and do not
 * represent real properties or live supplier availability.
 *
 * Run with:  pnpm --filter @voyago/api db:seed
 */
import { PrismaClient, type MealPlan, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';
import { randomBytes } from 'node:crypto';
import { addDays, toMinorUnits, todayIso } from '@voyago/shared';
import {
  CANCELLATION_POLICIES,
  HOTEL_POLICIES,
  RATE_PLAN_TEMPLATES,
  ROOM_TEMPLATES,
} from './seed/catalogue';
import { DESTINATIONS } from './seed/destinations';
import { FLIGHT_CANCELLATION_POLICIES, seedFlights } from './seed/flights';
import { DESTINATION_CONTENT } from './seed/content';
import { imageUrl } from './seed/images';
import { createRandom } from './seed/random';

const prisma = new PrismaClient();
const random = createRandom(20_261_028);

/** How many nights of inventory to generate from today. */
const INVENTORY_DAYS = 240;

function generatePassword(): string {
  return `Voyago-${randomBytes(6).toString('base64url')}-${random.int(100, 999)}`;
}

async function resetPostgres(): Promise<void> {
  // Ordered to respect foreign keys; TRUNCATE ... CASCADE keeps it to one statement.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      admin_audit_logs, refunds, booking_status_events, payment_attempts,
      booking_guests, bookings, quotes, room_inventory, rate_plans,
      room_images, rooms, hotel_images, hotels,
      flight_refunds, flight_booking_status_events, flight_payment_attempts,
      flight_passengers, flight_bookings, flight_quotes, flight_inventory,
      fare_classes, flights, airports, airlines,
      destinations, cancellation_policies, refresh_tokens, users
    RESTART IDENTITY CASCADE
  `);
}

async function seedUsers(): Promise<{ customer: string; admin: string }> {
  const customerPassword = process.env.SEED_DEMO_CUSTOMER_PASSWORD || generatePassword();
  const adminPassword = process.env.SEED_DEMO_ADMIN_PASSWORD || generatePassword();

  await prisma.user.create({
    data: {
      email: 'demo.customer@voyago.test',
      passwordHash: await bcrypt.hash(customerPassword, 12),
      firstName: 'Aarav',
      lastName: 'Sharma',
      phone: '+91 98200 12345',
      role: 'CUSTOMER',
    },
  });

  await prisma.user.create({
    data: {
      email: 'demo.admin@voyago.test',
      passwordHash: await bcrypt.hash(adminPassword, 12),
      firstName: 'Priya',
      lastName: 'Menon',
      phone: '+91 99300 54321',
      role: 'ADMIN',
    },
  });

  // A second customer, used by tests that prove one user cannot read another's
  // bookings. Its password is random unless explicitly provided.
  await prisma.user.create({
    data: {
      email: 'other.customer@voyago.test',
      passwordHash: await bcrypt.hash(customerPassword, 12),
      firstName: 'Rohan',
      lastName: 'Iyer',
      role: 'CUSTOMER',
    },
  });

  return { customer: customerPassword, admin: adminPassword };
}

async function seedPolicies(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const policy of [...CANCELLATION_POLICIES, ...FLIGHT_CANCELLATION_POLICIES]) {
    const row = await prisma.cancellationPolicy.create({
      data: {
        code: policy.code,
        name: policy.name,
        description: policy.description,
        refundable: policy.refundable,
        tiers: policy.tiers as unknown as Prisma.InputJsonValue,
      },
    });
    ids.set(policy.code, row.id);
  }
  return ids;
}

async function seedInventory(policyIds: Map<string, string>): Promise<{
  hotels: number;
  rooms: number;
  inventoryRows: number;
}> {
  let imageCursor = 0;
  let hotelCount = 0;
  let roomCount = 0;
  const inventoryRows: Prisma.RoomInventoryCreateManyInput[] = [];
  const startDate = todayIso();

  for (const destination of DESTINATIONS) {
    const destinationRow = await prisma.destination.create({
      data: {
        slug: destination.slug,
        city: destination.city,
        state: destination.state,
        country: 'India',
        tagline: destination.tagline,
        heroImageUrl: imageUrl(destination.heroIndex, 1600, 900),
      },
    });

    for (const hotel of destination.hotels) {
      const hotelRow = await prisma.hotel.create({
        data: {
          slug: hotel.slug,
          destinationId: destinationRow.id,
          name: hotel.name,
          starRating: hotel.starRating,
          guestRating: hotel.guestRating,
          reviewCount: hotel.reviewCount,
          addressLine: hotel.addressLine,
          locality: hotel.locality,
          postalCode: hotel.postalCode,
          phone: `+91 ${random.int(20, 99)} ${random.int(1000, 9999)} ${random.int(1000, 9999)}`,
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          shortDescription: hotel.shortDescription,
          description: hotel.description,
          checkInTime: '14:00',
          checkOutTime: '11:00',
          amenities: hotel.amenities,
          policies: HOTEL_POLICIES,
          images: {
            create: Array.from({ length: 5 }, (_, position) => ({
              url: imageUrl(imageCursor + position, 1200, 800),
              alt: `${hotel.name} - demo image ${position + 1}`,
              position,
            })),
          },
        },
      });
      imageCursor += 5;
      hotelCount += 1;

      // Three- and two-star properties do not offer the suite category.
      const templates = hotel.starRating >= 4 ? ROOM_TEMPLATES : ROOM_TEMPLATES.slice(0, 2);

      for (const template of templates) {
        const roomRow = await prisma.room.create({
          data: {
            hotelId: hotelRow.id,
            name: template.name,
            description: template.description,
            maxAdults: template.maxAdults,
            maxChildren: template.maxChildren,
            maxOccupancy: template.maxOccupancy,
            sizeSqm: template.sizeSqm,
            bedType: template.bedType,
            amenities: template.amenities,
            totalRooms: template.totalRooms,
            images: {
              create: Array.from({ length: 3 }, (_, position) => ({
                url: imageUrl(imageCursor + position, 900, 600),
                alt: `${template.name} at ${hotel.name} - demo image ${position + 1}`,
                position,
              })),
            },
          },
        });
        imageCursor += 3;
        roomCount += 1;

        // Non-refundable and breakfast plans everywhere; half board only at
        // four star and above, where a kitchen can support it.
        const plans = hotel.starRating >= 4 ? RATE_PLAN_TEMPLATES : RATE_PLAN_TEMPLATES.slice(0, 3);

        for (const plan of plans) {
          await prisma.ratePlan.create({
            data: {
              roomId: roomRow.id,
              cancellationPolicyId: policyIds.get(plan.policyCode)!,
              code: plan.code,
              name: plan.name,
              description: plan.description,
              mealPlan: plan.mealPlan as MealPlan,
              discountBasisPoints: plan.discountBasisPoints,
              supplementBasisPoints: plan.supplementBasisPoints,
            },
          });
        }

        const baseRupees = hotel.baseNightlyRupees * template.rateFactor * destination.priceFactor;

        for (let dayOffset = 0; dayOffset < INVENTORY_DAYS; dayOffset += 1) {
          const date = addDays(startDate, dayOffset);
          const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
          // Friday and Saturday carry a weekend premium.
          const weekendUplift = weekday === 5 || weekday === 6 ? 1.22 : 1;
          // A small deterministic wobble keeps prices from looking synthetic.
          const wobble = 0.94 + random.next() * 0.14;
          const nightly = Math.round((baseRupees * weekendUplift * wobble) / 50) * 50;

          // A handful of sell-outs so "no availability" states are reachable.
          const soldOut = random.next() < 0.03;

          inventoryRows.push({
            roomId: roomRow.id,
            date: new Date(`${date}T00:00:00.000Z`),
            roomsOpen: soldOut ? 0 : random.int(2, template.totalRooms),
            baseRateMinor: toMinorUnits(nightly),
          });
        }
      }
    }
  }

  // Bulk insert in chunks to keep each statement a sensible size.
  const CHUNK = 2_000;
  for (let index = 0; index < inventoryRows.length; index += CHUNK) {
    await prisma.roomInventory.createMany({ data: inventoryRows.slice(index, index + CHUNK) });
  }

  return { hotels: hotelCount, rooms: roomCount, inventoryRows: inventoryRows.length };
}

async function seedMongo(): Promise<number> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('  ! MONGODB_URI is not set - skipping destination content seed.');
    return 0;
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('destination_content');

    await collection.deleteMany({});
    await collection.createIndex({ destinationSlug: 1 }, { unique: true });

    const now = new Date();
    await collection.insertMany(
      DESTINATION_CONTENT.map((doc) => ({ ...doc, createdAt: now, updatedAt: now })),
    );

    // The snapshot collection is append-only at runtime; only its index is set up here.
    const snapshots = db.collection('supplier_snapshots');
    await snapshots.createIndex({ correlationId: 1 });
    await snapshots.createIndex({ kind: 1, createdAt: -1 });

    return DESTINATION_CONTENT.length;
  } catch (error) {
    console.warn(`  ! MongoDB seed skipped: ${String(error)}`);
    return 0;
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  console.log('Seeding Voyago demo data...');

  await resetPostgres();
  console.log('  - cleared existing data');

  const credentials = await seedUsers();
  console.log('  - created 3 demo users');

  const policyIds = await seedPolicies();
  console.log(`  - created ${policyIds.size} cancellation policies`);

  const counts = await seedInventory(policyIds);
  console.log(
    `  - created ${DESTINATIONS.length} destinations, ${counts.hotels} hotels, ` +
      `${counts.rooms} room types, ${counts.inventoryRows} inventory nights`,
  );

  const contentCount = await seedMongo();
  const flightCounts = await seedFlights(prisma, policyIds, INVENTORY_DAYS);
  console.log(
    `  - created ${flightCounts.airlines} airlines, ${flightCounts.airports} airports, ` +
      `${flightCounts.flights} flights, ${flightCounts.fareClasses} fare classes, ` +
      `${flightCounts.inventoryRows} flight inventory rows`,
  );

  console.log(`  - seeded ${contentCount} MongoDB destination content documents`);

  console.log('\nDemo accounts (local development only):');
  console.log(`  customer  demo.customer@voyago.test   ${credentials.customer}`);
  console.log(`  admin     demo.admin@voyago.test      ${credentials.admin}`);
  console.log(
    '\nSet SEED_DEMO_CUSTOMER_PASSWORD / SEED_DEMO_ADMIN_PASSWORD to choose these yourself.',
  );
  console.log('All inventory is demo data. No real supplier availability is represented.\n');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
