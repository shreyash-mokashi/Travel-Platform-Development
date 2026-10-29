import { applyBasisPoints, roundToMajorUnit } from './money';

/**
 * Flight-side domain logic, mirroring the hotel pricing conventions:
 * integer minor units only, percentages as basis points, derived amounts
 * rounded to whole rupees, and a breakdown whose lines always sum exactly
 * to the total.
 */

export const FARE_CODES = ['SAVER', 'FLEXI', 'BUSINESS'] as const;
export type FareCodeValue = (typeof FARE_CODES)[number];

export const CABINS = ['ECONOMY', 'BUSINESS'] as const;
export type CabinValue = (typeof CABINS)[number];

export const FARE_CODE_LABEL: Record<FareCodeValue, string> = {
  SAVER: 'Saver',
  FLEXI: 'Flexi',
  BUSINESS: 'Business',
};

export const CABIN_LABEL: Record<CabinValue, string> = {
  ECONOMY: 'Economy',
  BUSINESS: 'Business',
};

/**
 * GST on air travel in this demo: 5% for economy cabins, 12% for business,
 * a deliberate simplification of the Indian slabs.
 */
export const FARE_TAX_BASIS_POINTS: Record<CabinValue, number> = {
  ECONOMY: 500,
  BUSINESS: 1_200,
};

/** Flat convenience fee applied once per flight booking, in minor units. */
export const FLIGHT_CONVENIENCE_FEE_MINOR = 34_900;

export const FLIGHT_SEARCH_LIMITS = {
  /** Seats per booking; children occupy a seat and pay the full fare here. */
  MAX_PASSENGERS: 9,
  MAX_ADVANCE_DAYS: 365,
} as const;

export const FLIGHT_SORT_OPTIONS = [
  'departure_asc',
  'price_asc',
  'price_desc',
  'duration_asc',
] as const;
export type FlightSortOption = (typeof FLIGHT_SORT_OPTIONS)[number];

export interface FarePriceLine {
  code: 'BASE_FARE' | 'FARE_SUPPLEMENT' | 'FARE_DISCOUNT' | 'GST' | 'CONVENIENCE_FEE';
  label: string;
  amountMinor: number;
}

export interface FarePriceBreakdown {
  seats: number;
  perSeatBaseMinor: number;
  baseFareMinor: number;
  supplementMinor: number;
  discountMinor: number;
  taxableAmountMinor: number;
  taxBasisPoints: number;
  taxMinor: number;
  feesMinor: number;
  totalMinor: number;
  lines: FarePriceLine[];
}

export interface ComputeFarePriceInput {
  /** Base fare per seat for the travel date, in minor units. */
  perSeatBaseMinor: number;
  adults: number;
  children: number;
  cabin: CabinValue;
  supplementBasisPoints?: number;
  discountBasisPoints?: number;
  convenienceFeeMinor?: number;
}

/**
 * The single authoritative fare calculation, used at search, quote and
 * booking time so the server can always recompute a total from scratch.
 */
export function computeFarePrice(input: ComputeFarePriceInput): FarePriceBreakdown {
  const seats = input.adults + input.children;
  if (input.adults < 1) throw new Error('at least one adult is required');
  if (seats > FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS) {
    throw new Error(`at most ${FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS} passengers per booking`);
  }
  if (input.perSeatBaseMinor <= 0) throw new Error('perSeatBaseMinor must be positive');

  const baseFareMinor = input.perSeatBaseMinor * seats;

  const supplementBasisPoints = input.supplementBasisPoints ?? 0;
  const supplementMinor = roundToMajorUnit(applyBasisPoints(baseFareMinor, supplementBasisPoints));
  const grossMinor = baseFareMinor + supplementMinor;

  const discountBasisPoints = input.discountBasisPoints ?? 0;
  const discountMinor = roundToMajorUnit(applyBasisPoints(grossMinor, discountBasisPoints));
  const taxableAmountMinor = grossMinor - discountMinor;

  const taxBasisPoints = FARE_TAX_BASIS_POINTS[input.cabin];
  const taxMinor = roundToMajorUnit(applyBasisPoints(taxableAmountMinor, taxBasisPoints));

  const feesMinor = input.convenienceFeeMinor ?? FLIGHT_CONVENIENCE_FEE_MINOR;
  const totalMinor = taxableAmountMinor + taxMinor + feesMinor;

  const lines: FarePriceLine[] = [
    {
      code: 'BASE_FARE',
      label: `Base fare (${seats} traveller${seats > 1 ? 's' : ''})`,
      amountMinor: baseFareMinor,
    },
  ];
  if (supplementMinor > 0) {
    lines.push({ code: 'FARE_SUPPLEMENT', label: 'Fare supplement', amountMinor: supplementMinor });
  }
  if (discountMinor > 0) {
    lines.push({ code: 'FARE_DISCOUNT', label: 'Fare discount', amountMinor: -discountMinor });
  }
  lines.push({
    code: 'GST',
    label: `GST (${(taxBasisPoints / 100).toFixed(taxBasisPoints % 100 === 0 ? 0 : 2)}%)`,
    amountMinor: taxMinor,
  });
  lines.push({ code: 'CONVENIENCE_FEE', label: 'Convenience fee', amountMinor: feesMinor });

  const sum = lines.reduce((total, line) => total + line.amountMinor, 0);
  if (sum !== totalMinor) {
    throw new Error(`fare breakdown does not sum: lines=${sum} total=${totalMinor}`);
  }

  return {
    seats,
    perSeatBaseMinor: input.perSeatBaseMinor,
    baseFareMinor,
    supplementMinor,
    discountMinor,
    taxableAmountMinor,
    taxBasisPoints,
    taxMinor,
    feesMinor,
    totalMinor,
    lines,
  };
}

// ────────────────────────────── time helpers ──────────────────────────────

/** 400 -> "06:40". Every demo airport shares IST, so no timezone handling. */
export function minuteToClock(minuteOfDay: number): string {
  const normalised = ((minuteOfDay % 1440) + 1440) % 1440;
  const h = Math.floor(normalised / 60);
  const m = normalised % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 195 -> "3h 15m"; 120 -> "2h". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Arrival clock position and how many midnights the flight crosses. */
export function arrivalOf(
  departureMinute: number,
  durationMinutes: number,
): {
  arrivalMinute: number;
  dayOffset: number;
} {
  const raw = departureMinute + durationMinutes;
  return { arrivalMinute: raw % 1440, dayOffset: Math.floor(raw / 1440) };
}

/** Monday = bit 0 ... Sunday = bit 6, matching Flight.daysOfWeek. */
export function operatesOn(daysOfWeek: number, isoDate: string): boolean {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const bit = day === 0 ? 6 : day - 1;
  return (daysOfWeek & (1 << bit)) !== 0;
}

export const EVERY_DAY = 0b1111111;
