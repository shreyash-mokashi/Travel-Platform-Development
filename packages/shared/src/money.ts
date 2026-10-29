/**
 * Money is represented everywhere as an integer number of minor units
 * (paise for INR). Floating point is never used for authoritative amounts.
 */
export const DEMO_CURRENCY = 'INR' as const;
export type CurrencyCode = typeof DEMO_CURRENCY;

/** Minor units per major unit for the currencies this demo supports. */
export const MINOR_UNITS_PER_MAJOR: Record<CurrencyCode, number> = { INR: 100 };

export function toMinorUnits(major: number, currency: CurrencyCode = DEMO_CURRENCY): number {
  return Math.round(major * MINOR_UNITS_PER_MAJOR[currency]);
}

export function toMajorUnits(minor: number, currency: CurrencyCode = DEMO_CURRENCY): number {
  return minor / MINOR_UNITS_PER_MAJOR[currency];
}

/**
 * Applies a percentage expressed in basis points to an integer minor-unit
 * amount, rounding half away from zero so totals stay deterministic.
 */
export function applyBasisPoints(amountMinor: number, basisPoints: number): number {
  const scaled = amountMinor * basisPoints;
  const sign = scaled < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(scaled) / 10_000);
}

/**
 * Rounds a minor-unit amount to a whole major unit. Indian hotel invoices are
 * settled to the rupee, so derived amounts (tax, discount) are rounded here
 * rather than left with stray paise.
 */
export function roundToMajorUnit(minor: number, currency: CurrencyCode = DEMO_CURRENCY): number {
  const factor = MINOR_UNITS_PER_MAJOR[currency];
  return Math.round(minor / factor) * factor;
}

export function sumMinor(...amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}

export function formatMoney(minor: number, currency: CurrencyCode = DEMO_CURRENCY): string {
  // Whole amounts stay clean ("₹8,133"); fractional amounts always carry two
  // digits ("₹16,194.50"). A floating 0-2 range lets Intl print "₹16,194.5",
  // which no real travel site would show.
  const fractionDigits = minor % MINOR_UNITS_PER_MAJOR[currency] === 0 ? 0 : 2;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(toMajorUnits(minor, currency));
}
