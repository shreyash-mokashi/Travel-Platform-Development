import { addDays, todayIso } from '@voyago/shared';
import { buildSearchQuery, defaultStay, parseSearchParams, stayQuery } from '../search-params';

describe('parseSearchParams', () => {
  const base = { destination: 'goa', checkIn: '2099-01-10', checkOut: '2099-01-13' };

  it('reads a well-formed search unchanged', () => {
    const result = parseSearchParams({ ...base, rooms: '2', adults: '3', children: '1' });
    expect(result).toMatchObject({
      destination: 'goa',
      checkIn: '2099-01-10',
      checkOut: '2099-01-13',
      rooms: 2,
      adults: 3,
      children: 1,
    });
  });

  it('falls back to a sensible stay when dates are missing', () => {
    const result = parseSearchParams({ destination: 'goa' });
    const fallback = defaultStay();
    expect(result.checkIn).toBe(fallback.checkIn);
    expect(result.checkOut).toBe(fallback.checkOut);
  });

  it('repairs a check-in in the past', () => {
    const result = parseSearchParams({ ...base, checkIn: addDays(todayIso(), -5) });
    expect(result.checkIn >= todayIso()).toBe(true);
  });

  it('repairs a check-out on or before check-in', () => {
    const result = parseSearchParams({ ...base, checkOut: '2099-01-10' });
    expect(result.checkOut > result.checkIn).toBe(true);
  });

  it('caps a stay longer than the supported maximum', () => {
    const result = parseSearchParams({ ...base, checkOut: '2099-06-10' });
    expect(result.checkOut).toBe(addDays(result.checkIn, 30));
  });

  it('clamps occupancy to the per-room limits', () => {
    const result = parseSearchParams({ ...base, rooms: '1', adults: '99', children: '99' });
    expect(result.adults).toBeLessThanOrEqual(4);
    expect(result.children).toBeLessThanOrEqual(3);
  });

  it('clamps an out-of-range room count', () => {
    expect(parseSearchParams({ ...base, rooms: '0' }).rooms).toBe(1);
    expect(parseSearchParams({ ...base, rooms: '50' }).rooms).toBe(5);
  });

  it('ignores a non-numeric page and defaults to the first', () => {
    expect(parseSearchParams({ ...base, page: 'abc' }).page).toBe(1);
  });

  it('ignores an unknown sort option', () => {
    expect(parseSearchParams({ ...base, sort: 'cheapest' }).sort).toBe('relevance');
    expect(parseSearchParams({ ...base, sort: 'price_desc' }).sort).toBe('price_desc');
  });

  it('parses comma-separated multi-value filters', () => {
    const result = parseSearchParams({
      ...base,
      starRatings: '4,5',
      amenities: 'pool,spa',
      mealPlans: 'breakfast',
    });
    expect(result.starRatings).toEqual([4, 5]);
    expect(result.amenities).toEqual(['POOL', 'SPA']);
    expect(result.mealPlans).toEqual(['BREAKFAST']);
  });

  it('drops star ratings outside 1 to 5', () => {
    expect(parseSearchParams({ ...base, starRatings: '0,3,9' }).starRatings).toEqual([3]);
  });

  it('treats freeCancellation as a strict boolean flag', () => {
    expect(parseSearchParams({ ...base, freeCancellation: 'true' }).freeCancellation).toBe(true);
    expect(parseSearchParams({ ...base, freeCancellation: '1' }).freeCancellation).toBe(false);
    expect(parseSearchParams(base).freeCancellation).toBe(false);
  });

  it('handles a repeated query parameter', () => {
    const result = parseSearchParams({ ...base, amenities: ['POOL', 'GYM'] });
    expect(result.amenities).toEqual(['POOL', 'GYM']);
  });
});

describe('buildSearchQuery', () => {
  it('round-trips a search through the URL', () => {
    const search = parseSearchParams({
      destination: 'goa',
      checkIn: '2099-01-10',
      checkOut: '2099-01-13',
      rooms: '2',
      adults: '4',
      children: '1',
      sort: 'price_asc',
      starRatings: '4,5',
    });

    const reparsed = parseSearchParams(
      Object.fromEntries(new URLSearchParams(buildSearchQuery(search))),
    );
    expect(reparsed).toEqual(search);
  });

  it('omits default values to keep URLs short', () => {
    const query = buildSearchQuery({ destination: 'goa', sort: 'relevance', page: 1 });
    expect(query).not.toContain('sort=');
    expect(query).not.toContain('page=');
  });

  it('includes a non-default sort and page', () => {
    const query = buildSearchQuery({ destination: 'goa', sort: 'rating_desc', page: 3 });
    expect(query).toContain('sort=rating_desc');
    expect(query).toContain('page=3');
  });
});

describe('stayQuery', () => {
  it('emits only the stay parameters', () => {
    const params = new URLSearchParams(
      stayQuery({
        checkIn: '2099-01-10',
        checkOut: '2099-01-12',
        rooms: 1,
        adults: 2,
        children: 0,
      }),
    );
    expect([...params.keys()].sort()).toEqual([
      'adults',
      'checkIn',
      'checkOut',
      'children',
      'rooms',
    ]);
  });
});
