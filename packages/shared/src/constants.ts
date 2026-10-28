import type { MealPlan } from './enums';

export const SEARCH_LIMITS = {
  MAX_NIGHTS: 30,
  MAX_ROOMS: 5,
  MAX_ADULTS_PER_ROOM: 4,
  MAX_CHILDREN_PER_ROOM: 3,
  MAX_CHILD_AGE: 17,
  MAX_ADVANCE_DAYS: 365,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
} as const;

/** Minutes a price quote (and its soft inventory hold) stays valid. */
export const QUOTE_TTL_MINUTES = 20;

/** Minutes an unpaid booking stays open before it can be expired. */
export const BOOKING_PAYMENT_WINDOW_MINUTES = 30;

export const HOTEL_SORT_OPTIONS = ['relevance', 'price_asc', 'price_desc', 'rating_desc'] as const;
export type HotelSortOption = (typeof HOTEL_SORT_OPTIONS)[number];

export const AMENITY_CODES = [
  'WIFI',
  'POOL',
  'SPA',
  'GYM',
  'RESTAURANT',
  'BAR',
  'PARKING',
  'AIRPORT_SHUTTLE',
  'PET_FRIENDLY',
  'AIR_CONDITIONING',
  'ROOM_SERVICE',
  'BUSINESS_CENTRE',
  'BEACH_ACCESS',
  'FAMILY_ROOMS',
  'WHEELCHAIR_ACCESS',
] as const;
export type AmenityCode = (typeof AMENITY_CODES)[number];

export const AMENITY_LABEL: Record<AmenityCode, string> = {
  WIFI: 'Free Wi-Fi',
  POOL: 'Swimming pool',
  SPA: 'Spa',
  GYM: 'Fitness centre',
  RESTAURANT: 'Restaurant',
  BAR: 'Bar / lounge',
  PARKING: 'Free parking',
  AIRPORT_SHUTTLE: 'Airport shuttle',
  PET_FRIENDLY: 'Pet friendly',
  AIR_CONDITIONING: 'Air conditioning',
  ROOM_SERVICE: '24h room service',
  BUSINESS_CENTRE: 'Business centre',
  BEACH_ACCESS: 'Beach access',
  FAMILY_ROOMS: 'Family rooms',
  WHEELCHAIR_ACCESS: 'Step-free access',
};

export const MEAL_PLAN_ORDER: MealPlan[] = ['ROOM_ONLY', 'BREAKFAST', 'HALF_BOARD', 'FULL_BOARD'];

/** GST slabs applied to hotel room tariffs in this demo (basis points). */
export const GST_SLABS = [
  { maxNightlyRateMinor: 750_000, basisPoints: 1_200 },
  { maxNightlyRateMinor: Number.MAX_SAFE_INTEGER, basisPoints: 1_800 },
] as const;

/** Flat property service fee applied per booking, in minor units. */
export const SERVICE_FEE_MINOR = 19_900;
