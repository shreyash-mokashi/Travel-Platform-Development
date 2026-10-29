import {
  arrivalOf,
  computeFarePrice,
  formatDuration,
  minuteToClock,
  operatesOn,
  EVERY_DAY,
} from '@voyago/shared';

describe('computeFarePrice', () => {
  it('prices a plain economy saver fare with 5% GST and the convenience fee', () => {
    const price = computeFarePrice({
      perSeatBaseMinor: 450_000,
      adults: 2,
      children: 0,
      cabin: 'ECONOMY',
    });

    expect(price.baseFareMinor).toBe(900_000);
    expect(price.taxBasisPoints).toBe(500);
    expect(price.taxMinor).toBe(45_000);
    expect(price.feesMinor).toBe(34_900);
    expect(price.totalMinor).toBe(979_900);
  });

  it('applies business cabin GST at 12%', () => {
    const price = computeFarePrice({
      perSeatBaseMinor: 1_000_000,
      adults: 1,
      children: 0,
      cabin: 'BUSINESS',
      supplementBasisPoints: 0,
    });
    expect(price.taxMinor).toBe(120_000);
  });

  it('lines always sum exactly to the total, including supplement and discount', () => {
    const price = computeFarePrice({
      perSeatBaseMinor: 333_333,
      adults: 2,
      children: 1,
      cabin: 'ECONOMY',
      supplementBasisPoints: 1_750,
      discountBasisPoints: 825,
    });
    const sum = price.lines.reduce((total, line) => total + line.amountMinor, 0);
    expect(sum).toBe(price.totalMinor);
    expect(price.seats).toBe(3);
    // Derived amounts are whole rupees.
    expect(price.supplementMinor % 100).toBe(0);
    expect(price.discountMinor % 100).toBe(0);
    expect(price.taxMinor % 100).toBe(0);
  });

  it('children occupy seats at full fare in this demo', () => {
    const adultsOnly = computeFarePrice({
      perSeatBaseMinor: 500_000,
      adults: 2,
      children: 0,
      cabin: 'ECONOMY',
    });
    const withChild = computeFarePrice({
      perSeatBaseMinor: 500_000,
      adults: 1,
      children: 1,
      cabin: 'ECONOMY',
    });
    expect(withChild.totalMinor).toBe(adultsOnly.totalMinor);
  });

  it('rejects zero adults and oversized parties', () => {
    expect(() =>
      computeFarePrice({ perSeatBaseMinor: 500_000, adults: 0, children: 1, cabin: 'ECONOMY' }),
    ).toThrow(/adult/);
    expect(() =>
      computeFarePrice({ perSeatBaseMinor: 500_000, adults: 9, children: 1, cabin: 'ECONOMY' }),
    ).toThrow(/passengers/);
  });
});

describe('schedule helpers', () => {
  it('formats clock positions and durations', () => {
    expect(minuteToClock(400)).toBe('06:40');
    expect(minuteToClock(0)).toBe('00:00');
    expect(formatDuration(195)).toBe('3h 15m');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(45)).toBe('45m');
  });

  it('computes arrivals that cross midnight', () => {
    expect(arrivalOf(1_380, 150)).toEqual({ arrivalMinute: 90, dayOffset: 1 });
    expect(arrivalOf(400, 95)).toEqual({ arrivalMinute: 495, dayOffset: 0 });
  });

  it('maps ISO dates onto the Monday-first operating bitmask', () => {
    // 2027-01-11 is a Monday.
    expect(operatesOn(0b0000001, '2027-01-11')).toBe(true);
    expect(operatesOn(0b0000001, '2027-01-12')).toBe(false);
    // 2027-01-17 is a Sunday.
    expect(operatesOn(0b1000000, '2027-01-17')).toBe(true);
    expect(operatesOn(EVERY_DAY, '2027-01-14')).toBe(true);
  });
});
