import {
  applyBasisPoints,
  computePrice,
  evaluateCancellation,
  formatMoney,
  nightsBetween,
  resolveTaxBasisPoints,
  roundToMajorUnit,
  toMinorUnits,
  type CancellationPolicy,
  type NightlyRate,
} from '@voyago/shared';

const nightly = (amounts: number[]): NightlyRate[] =>
  amounts.map((amount, index) => ({
    date: `2026-12-${String(index + 1).padStart(2, '0')}`,
    amountMinor: amount,
  }));

describe('money helpers', () => {
  it('converts rupees to paise without floating point drift', () => {
    expect(toMinorUnits(1234.56)).toBe(123456);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
  });

  it('applies basis points with half-away-from-zero rounding', () => {
    expect(applyBasisPoints(100_000, 1_800)).toBe(18_000);
    // 12.5 paise must round up, not to even.
    expect(applyBasisPoints(1, 1_250)).toBe(0);
    expect(applyBasisPoints(100, 1_250)).toBe(13);
    expect(applyBasisPoints(-100, 1_250)).toBe(-13);
  });

  it('rounds minor units to whole rupees', () => {
    expect(roundToMajorUnit(12_349)).toBe(12_300);
    expect(roundToMajorUnit(12_350)).toBe(12_400);
  });

  it('formats INR for an Indian audience', () => {
    expect(formatMoney(4_993_800)).toContain('49,938');
  });
});

describe('resolveTaxBasisPoints', () => {
  it('uses the 12% slab below the 7,500 rupee threshold', () => {
    expect(resolveTaxBasisPoints(nightly([500_000, 700_000]))).toBe(1_200);
  });

  it('uses the 18% slab when any night exceeds the threshold', () => {
    expect(resolveTaxBasisPoints(nightly([500_000, 800_000]))).toBe(1_800);
  });

  it('treats the threshold itself as the lower slab', () => {
    expect(resolveTaxBasisPoints(nightly([750_000]))).toBe(1_200);
  });
});

describe('computePrice', () => {
  it('multiplies the nightly tariff across nights and rooms', () => {
    const price = computePrice({ nightlyRates: nightly([300_000, 300_000]), rooms: 2 });
    expect(price.roomTariffMinor).toBe(1_200_000);
    expect(price.nights).toBe(2);
    expect(price.rooms).toBe(2);
  });

  it('adds a rate-plan supplement before discount and tax', () => {
    const price = computePrice({
      nightlyRates: nightly([100_000]),
      rooms: 1,
      supplementBasisPoints: 1_000,
    });
    expect(price.supplementMinor).toBe(10_000);
    expect(price.baseAmountMinor).toBe(110_000);
  });

  it('applies the discount to the supplemented tariff', () => {
    const price = computePrice({
      nightlyRates: nightly([100_000]),
      rooms: 1,
      supplementBasisPoints: 1_000,
      discountBasisPoints: 1_000,
    });
    expect(price.discountMinor).toBe(11_000);
    expect(price.taxableAmountMinor).toBe(99_000);
  });

  it('produces a total that equals the sum of its own lines', () => {
    const price = computePrice({
      nightlyRates: nightly([412_300, 530_900, 389_100]),
      rooms: 3,
      discountBasisPoints: 750,
      supplementBasisPoints: 1_400,
    });
    const lineSum = price.lines.reduce((total, line) => total + line.amountMinor, 0);
    expect(lineSum).toBe(price.totalMinor);
  });

  it('keeps every derived amount an integer', () => {
    const price = computePrice({
      nightlyRates: nightly([333_333]),
      rooms: 3,
      discountBasisPoints: 1_234,
      supplementBasisPoints: 777,
    });
    for (const value of [
      price.roomTariffMinor,
      price.supplementMinor,
      price.discountMinor,
      price.taxMinor,
      price.feesMinor,
      price.totalMinor,
    ]) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('rejects a zero-night or zero-room request', () => {
    expect(() => computePrice({ nightlyRates: [], rooms: 1 })).toThrow();
    expect(() => computePrice({ nightlyRates: nightly([100_000]), rooms: 0 })).toThrow();
  });
});

describe('nightsBetween', () => {
  it('counts check-in inclusive and check-out exclusive', () => {
    expect(nightsBetween('2026-12-10', '2026-12-13')).toBe(3);
  });

  it('is unaffected by daylight-saving style offsets', () => {
    expect(nightsBetween('2026-03-28', '2026-03-30')).toBe(2);
  });
});

describe('evaluateCancellation', () => {
  const refundable: CancellationPolicy = {
    code: 'FREE_48H',
    name: 'Free until 48 hours',
    description: '',
    refundable: true,
    tiers: [
      { hoursBeforeCheckIn: 48, penaltyBasisPoints: 0, label: 'Full refund.' },
      { hoursBeforeCheckIn: 24, penaltyBasisPoints: 3_000, label: '30% retained.' },
      { hoursBeforeCheckIn: 0, penaltyBasisPoints: 7_500, label: '75% retained.' },
    ],
  };

  const nonRefundable: CancellationPolicy = {
    code: 'NON_REFUNDABLE',
    name: 'Saver',
    description: '',
    refundable: false,
    tiers: [],
  };

  const checkIn = '2026-12-20';
  const at = (iso: string) => new Date(iso);

  it('refunds in full well before check-in', () => {
    const outcome = evaluateCancellation({
      policy: refundable,
      totalMinor: 100_000,
      checkIn,
      now: at('2026-12-15T12:00:00Z'),
    });
    expect(outcome.refundMinor).toBe(100_000);
    expect(outcome.penaltyMinor).toBe(0);
  });

  it('retains 30% inside the 48 hour window', () => {
    const outcome = evaluateCancellation({
      policy: refundable,
      totalMinor: 100_000,
      checkIn,
      now: at('2026-12-19T00:00:00Z'),
    });
    expect(outcome.penaltyMinor).toBe(30_000);
    expect(outcome.refundMinor).toBe(70_000);
  });

  it('retains 75% inside the 24 hour window', () => {
    const outcome = evaluateCancellation({
      policy: refundable,
      totalMinor: 100_000,
      checkIn,
      now: at('2026-12-19T20:00:00Z'),
    });
    expect(outcome.penaltyMinor).toBe(75_000);
  });

  it('refunds nothing after check-in has passed', () => {
    const outcome = evaluateCancellation({
      policy: refundable,
      totalMinor: 100_000,
      checkIn,
      now: at('2026-12-21T12:00:00Z'),
    });
    expect(outcome.refundMinor).toBe(0);
    expect(outcome.refundable).toBe(false);
  });

  it('never refunds a non-refundable rate, even months ahead', () => {
    const outcome = evaluateCancellation({
      policy: nonRefundable,
      totalMinor: 100_000,
      checkIn,
      now: at('2026-06-01T12:00:00Z'),
    });
    expect(outcome.allowed).toBe(true);
    expect(outcome.refundMinor).toBe(0);
    expect(outcome.penaltyMinor).toBe(100_000);
  });
});
