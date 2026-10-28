import {
  SEARCH_LIMITS,
  addDays,
  isIsoDate,
  nightsBetween,
  todayIso,
  type HotelSortOption,
} from '@voyago/shared';
import { HOTEL_SORT_OPTIONS } from '@voyago/shared';

export interface StaySearch {
  destination: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  page: number;
  sort: HotelSortOption;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  starRatings: number[];
  amenities: string[];
  mealPlans: string[];
  freeCancellation: boolean;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const list = (value: string | string[] | undefined): string[] => {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((item) => item.split(','))
    .map((item) => item.trim())
    .filter(Boolean);
};

const clampInt = (value: string | undefined, min: number, max: number, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

/** Default stay used when a visitor lands without dates. */
export function defaultStay(): { checkIn: string; checkOut: string } {
  const checkIn = addDays(todayIso(), 14);
  return { checkIn, checkOut: addDays(checkIn, 2) };
}

/**
 * Parses and repairs URL search parameters. The search page is URL-backed so
 * links are shareable and back/forward navigation restores exact results.
 */
export function parseSearchParams(params: RawSearchParams): StaySearch {
  const fallback = defaultStay();

  let checkIn = first(params.checkIn) ?? '';
  let checkOut = first(params.checkOut) ?? '';
  if (!isIsoDate(checkIn) || checkIn < todayIso()) checkIn = fallback.checkIn;
  if (!isIsoDate(checkOut) || checkOut <= checkIn) checkOut = addDays(checkIn, 2);
  if (nightsBetween(checkIn, checkOut) > SEARCH_LIMITS.MAX_NIGHTS) {
    checkOut = addDays(checkIn, SEARCH_LIMITS.MAX_NIGHTS);
  }

  const rooms = clampInt(first(params.rooms), 1, SEARCH_LIMITS.MAX_ROOMS, 1);
  const adults = clampInt(
    first(params.adults),
    1,
    rooms * SEARCH_LIMITS.MAX_ADULTS_PER_ROOM,
    Math.min(2, rooms * SEARCH_LIMITS.MAX_ADULTS_PER_ROOM),
  );
  const children = clampInt(
    first(params.children),
    0,
    rooms * SEARCH_LIMITS.MAX_CHILDREN_PER_ROOM,
    0,
  );

  const sortRaw = first(params.sort);
  const sort = (HOTEL_SORT_OPTIONS as readonly string[]).includes(sortRaw ?? '')
    ? (sortRaw as HotelSortOption)
    : 'relevance';

  const minPrice = Number(first(params.minPriceMinor));
  const maxPrice = Number(first(params.maxPriceMinor));

  return {
    destination: (first(params.destination) ?? '').trim(),
    checkIn,
    checkOut,
    rooms,
    adults,
    children,
    page: clampInt(first(params.page), 1, 999, 1),
    sort,
    ...(Number.isFinite(minPrice) && minPrice >= 0 ? { minPriceMinor: minPrice } : {}),
    ...(Number.isFinite(maxPrice) && maxPrice > 0 ? { maxPriceMinor: maxPrice } : {}),
    starRatings: list(params.starRatings)
      .map(Number)
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5),
    amenities: list(params.amenities).map((value) => value.toUpperCase()),
    mealPlans: list(params.mealPlans).map((value) => value.toUpperCase()),
    freeCancellation: first(params.freeCancellation) === 'true',
  };
}

/** Serialises a search back into a query string, omitting defaults. */
export function buildSearchQuery(search: Partial<StaySearch>): string {
  const query = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== '' && value !== null) query.set(key, String(value));
  };

  set('destination', search.destination);
  set('checkIn', search.checkIn);
  set('checkOut', search.checkOut);
  set('rooms', search.rooms);
  set('adults', search.adults);
  set('children', search.children);
  if (search.page && search.page > 1) set('page', search.page);
  if (search.sort && search.sort !== 'relevance') set('sort', search.sort);
  set('minPriceMinor', search.minPriceMinor);
  set('maxPriceMinor', search.maxPriceMinor);
  if (search.starRatings?.length) query.set('starRatings', search.starRatings.join(','));
  if (search.amenities?.length) query.set('amenities', search.amenities.join(','));
  if (search.mealPlans?.length) query.set('mealPlans', search.mealPlans.join(','));
  if (search.freeCancellation) query.set('freeCancellation', 'true');

  return query.toString();
}

/** The subset of a search that identifies the stay itself. */
export function stayQuery(
  search: Pick<StaySearch, 'checkIn' | 'checkOut' | 'rooms' | 'adults' | 'children'>,
): string {
  return new URLSearchParams({
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    rooms: String(search.rooms),
    adults: String(search.adults),
    children: String(search.children),
  }).toString();
}
