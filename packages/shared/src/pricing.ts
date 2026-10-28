import { GST_SLABS, SERVICE_FEE_MINOR } from './constants';
import { applyBasisPoints, roundToMajorUnit } from './money';

export interface NightlyRate {
  /** Stay night in YYYY-MM-DD form. */
  date: string;
  /** Rate for one room for this night, in minor units. */
  amountMinor: number;
}

export interface PriceLine {
  code: string;
  label: string;
  amountMinor: number;
}

export interface PriceBreakdown {
  nights: number;
  rooms: number;
  nightlyRates: NightlyRate[];
  /** Pure room tariff for all rooms and nights, before any adjustment. */
  roomTariffMinor: number;
  /** Premium charged for the rate plan's inclusions. */
  supplementMinor: number;
  /** Room tariff plus supplement, before discount, taxes and fees. */
  baseAmountMinor: number;
  discountMinor: number;
  taxableAmountMinor: number;
  taxMinor: number;
  taxBasisPoints: number;
  feesMinor: number;
  totalMinor: number;
  lines: PriceLine[];
}

/**
 * Indian GST on hotel rooms is slab-based on the per-night tariff, so the slab
 * is selected from the highest nightly rate in the stay.
 */
export function resolveTaxBasisPoints(nightlyRates: NightlyRate[]): number {
  const highest = nightlyRates.reduce((max, rate) => Math.max(max, rate.amountMinor), 0);
  const slab = GST_SLABS.find((candidate) => highest <= candidate.maxNightlyRateMinor);
  if (slab) return slab.basisPoints;
  const fallback = GST_SLABS[GST_SLABS.length - 1];
  return fallback ? fallback.basisPoints : 0;
}

export interface ComputePriceInput {
  nightlyRates: NightlyRate[];
  rooms: number;
  /** Promotional discount on the room tariff, in basis points. */
  discountBasisPoints?: number;
  /** Premium for meals or flexibility, in basis points of the room tariff. */
  supplementBasisPoints?: number;
  serviceFeeMinor?: number;
}

/**
 * Single source of truth for hotel pricing. Pure and integer-only so the API
 * can recompute an authoritative total for any client-supplied selection.
 */
export function computePrice(input: ComputePriceInput): PriceBreakdown {
  const { nightlyRates, rooms } = input;
  if (rooms < 1) throw new Error('rooms must be at least 1');
  if (nightlyRates.length === 0) throw new Error('nightlyRates must not be empty');

  const perRoomBase = nightlyRates.reduce((total, rate) => total + rate.amountMinor, 0);
  const roomTariffMinor = perRoomBase * rooms;

  const supplementBasisPoints = input.supplementBasisPoints ?? 0;
  const supplementMinor = roundToMajorUnit(
    applyBasisPoints(roomTariffMinor, supplementBasisPoints),
  );
  const baseAmountMinor = roomTariffMinor + supplementMinor;

  const discountBasisPoints = input.discountBasisPoints ?? 0;
  const discountMinor = roundToMajorUnit(applyBasisPoints(baseAmountMinor, discountBasisPoints));
  const taxableAmountMinor = baseAmountMinor - discountMinor;

  const taxBasisPoints = resolveTaxBasisPoints(nightlyRates);
  const taxMinor = roundToMajorUnit(applyBasisPoints(taxableAmountMinor, taxBasisPoints));

  const feesMinor = input.serviceFeeMinor ?? SERVICE_FEE_MINOR;
  const totalMinor = taxableAmountMinor + taxMinor + feesMinor;

  const lines: PriceLine[] = [
    {
      code: 'ROOM_TARIFF',
      label: `Room tariff (${nightlyRates.length} night${nightlyRates.length > 1 ? 's' : ''} x ${rooms} room${rooms > 1 ? 's' : ''})`,
      amountMinor: roomTariffMinor,
    },
  ];
  if (supplementMinor > 0) {
    lines.push({ code: 'SUPPLEMENT', label: 'Rate plan inclusions', amountMinor: supplementMinor });
  }
  if (discountMinor > 0) {
    lines.push({ code: 'DISCOUNT', label: 'Promotional discount', amountMinor: -discountMinor });
  }
  lines.push({
    code: 'GST',
    label: `GST (${(taxBasisPoints / 100).toFixed(0)}%)`,
    amountMinor: taxMinor,
  });
  lines.push({ code: 'SERVICE_FEE', label: 'Service fee', amountMinor: feesMinor });

  return {
    nights: nightlyRates.length,
    rooms,
    nightlyRates,
    roomTariffMinor,
    supplementMinor,
    baseAmountMinor,
    discountMinor,
    taxableAmountMinor,
    taxMinor,
    taxBasisPoints,
    feesMinor,
    totalMinor,
    lines,
  };
}
