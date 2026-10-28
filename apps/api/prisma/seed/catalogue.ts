import type { MealPlan } from '@prisma/client';

export interface DestinationSeed {
  slug: string;
  city: string;
  state: string;
  tagline: string;
  heroIndex: number;
  /** Multiplier applied to base nightly tariffs for this market. */
  priceFactor: number;
  hotels: HotelSeed[];
}

export interface HotelSeed {
  slug: string;
  name: string;
  starRating: number;
  guestRating: number;
  reviewCount: number;
  addressLine: string;
  locality: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  shortDescription: string;
  description: string;
  amenities: string[];
  /** Nightly tariff for the entry-level room, in rupees. */
  baseNightlyRupees: number;
}

export interface RoomSeed {
  name: string;
  description: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  sizeSqm: number;
  bedType: string;
  amenities: string[];
  totalRooms: number;
  /** Multiplier on the hotel's base tariff. */
  rateFactor: number;
}

export interface RatePlanSeed {
  code: string;
  name: string;
  description: string;
  mealPlan: MealPlan;
  discountBasisPoints: number;
  /** Premium charged for meals or a more flexible policy, in basis points. */
  supplementBasisPoints: number;
  policyCode: string;
}

export const CANCELLATION_POLICIES = [
  {
    code: 'FREE_48H',
    name: 'Free cancellation until 48 hours before check-in',
    description:
      'Cancel at least 48 hours before check-in for a full refund. Cancel within 48 hours ' +
      'and one night is retained. No refund once the stay has begun.',
    refundable: true,
    tiers: [
      {
        hoursBeforeCheckIn: 48,
        penaltyBasisPoints: 0,
        label: 'Cancelled more than 48 hours before check-in: full refund.',
      },
      {
        hoursBeforeCheckIn: 24,
        penaltyBasisPoints: 3_000,
        label: 'Cancelled 24-48 hours before check-in: 30% retained.',
      },
      {
        hoursBeforeCheckIn: 0,
        penaltyBasisPoints: 7_500,
        label: 'Cancelled within 24 hours of check-in: 75% retained.',
      },
    ],
  },
  {
    code: 'FLEX_24H',
    name: 'Flexible - free cancellation until 24 hours before check-in',
    description:
      'Cancel at least 24 hours before check-in for a full refund. Later cancellations ' +
      'retain half the booking value.',
    refundable: true,
    tiers: [
      {
        hoursBeforeCheckIn: 24,
        penaltyBasisPoints: 0,
        label: 'Cancelled more than 24 hours before check-in: full refund.',
      },
      {
        hoursBeforeCheckIn: 0,
        penaltyBasisPoints: 5_000,
        label: 'Cancelled within 24 hours of check-in: 50% retained.',
      },
    ],
  },
  {
    code: 'PARTIAL_72H',
    name: 'Partially refundable',
    description:
      'Cancel at least 72 hours before check-in and 85% is refunded. Closer to arrival a ' +
      'larger share is retained.',
    refundable: true,
    tiers: [
      {
        hoursBeforeCheckIn: 72,
        penaltyBasisPoints: 1_500,
        label: 'Cancelled more than 72 hours before check-in: 15% retained.',
      },
      {
        hoursBeforeCheckIn: 24,
        penaltyBasisPoints: 5_000,
        label: 'Cancelled 24-72 hours before check-in: 50% retained.',
      },
      {
        hoursBeforeCheckIn: 0,
        penaltyBasisPoints: 10_000,
        label: 'Cancelled within 24 hours of check-in: no refund.',
      },
    ],
  },
  {
    code: 'NON_REFUNDABLE',
    name: 'Non-refundable saver',
    description:
      'The lowest available rate. The booking can be cancelled but no amount is refunded.',
    refundable: false,
    tiers: [],
  },
] as const;

export const ROOM_TEMPLATES: RoomSeed[] = [
  {
    name: 'Superior Queen Room',
    description:
      'A bright 26 sqm room with a queen bed, work desk and city-facing window. Suited to ' +
      'couples and solo travellers.',
    maxAdults: 2,
    maxChildren: 1,
    maxOccupancy: 3,
    sizeSqm: 26,
    bedType: '1 queen bed',
    amenities: ['WIFI', 'AIR_CONDITIONING', 'ROOM_SERVICE'],
    totalRooms: 12,
    rateFactor: 1,
  },
  {
    name: 'Deluxe King Room',
    description:
      'A 34 sqm room with a king bed, seating area and rain shower. Higher floors offer ' +
      'the better outlook.',
    maxAdults: 2,
    maxChildren: 2,
    maxOccupancy: 4,
    sizeSqm: 34,
    bedType: '1 king bed',
    amenities: ['WIFI', 'AIR_CONDITIONING', 'ROOM_SERVICE', 'FAMILY_ROOMS'],
    totalRooms: 8,
    rateFactor: 1.35,
  },
  {
    name: 'Premier Suite',
    description:
      'A 52 sqm suite with a separate living room, walk-in wardrobe and lounge access for ' +
      'two guests.',
    maxAdults: 3,
    maxChildren: 2,
    maxOccupancy: 5,
    sizeSqm: 52,
    bedType: '1 king bed + sofa bed',
    amenities: ['WIFI', 'AIR_CONDITIONING', 'ROOM_SERVICE', 'FAMILY_ROOMS', 'BUSINESS_CENTRE'],
    totalRooms: 4,
    rateFactor: 1.9,
  },
];

export const RATE_PLAN_TEMPLATES: RatePlanSeed[] = [
  {
    code: 'SAVER',
    name: 'Saver rate - room only',
    description: 'Our lowest rate. Pay now, no changes and no refund.',
    mealPlan: 'ROOM_ONLY',
    discountBasisPoints: 1_200,
    supplementBasisPoints: 0,
    policyCode: 'NON_REFUNDABLE',
  },
  {
    code: 'BB_FLEX',
    name: 'Breakfast included - flexible',
    description: 'Buffet breakfast for all guests, with free cancellation until 24 hours out.',
    mealPlan: 'BREAKFAST',
    discountBasisPoints: 0,
    supplementBasisPoints: 800,
    policyCode: 'FLEX_24H',
  },
  {
    code: 'BB_FREECXL',
    name: 'Breakfast included - free cancellation',
    description: 'Buffet breakfast plus free cancellation until 48 hours before check-in.',
    mealPlan: 'BREAKFAST',
    discountBasisPoints: 0,
    supplementBasisPoints: 1_400,
    policyCode: 'FREE_48H',
  },
  {
    code: 'HB_PARTIAL',
    name: 'Half board - breakfast and dinner',
    description: 'Breakfast and dinner included, partially refundable until 72 hours out.',
    mealPlan: 'HALF_BOARD',
    discountBasisPoints: 0,
    supplementBasisPoints: 2_600,
    policyCode: 'PARTIAL_72H',
  },
];

export const HOTEL_POLICIES = [
  'Government-issued photo identification is required for every adult guest at check-in.',
  'Children under 6 stay free when using existing bedding.',
  'Pets are not permitted unless the property lists a pet-friendly amenity.',
  'Smoking is not permitted in guest rooms.',
  'This is demo inventory created for the Voyago portfolio project. It does not represent a real property.',
];
