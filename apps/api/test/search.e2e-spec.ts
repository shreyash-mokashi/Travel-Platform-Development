import type { INestApplication } from '@nestjs/common';
import { addDays, todayIso } from '@voyago/shared';
import request from 'supertest';
import { API, createTestApp, futureStay } from './setup';

describe('Hotel search (e2e)', () => {
  let app: INestApplication;
  const stay = futureStay(30, 3);

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();
  const search = (params: Record<string, string | number>) =>
    request(server())
      .get(`${API}/hotels/search`)
      .query({
        destination: 'goa',
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        rooms: 1,
        adults: 2,
        children: 0,
        ...params,
      });

  it('returns seeded hotels with a server-computed lead price', async () => {
    const response = await search({}).expect(200);

    expect(response.body.total).toBeGreaterThan(0);
    expect(response.body.destination.city).toBe('Goa');
    expect(response.body.nights).toBe(3);
    expect(response.body.currency).toBe('INR');

    for (const hotel of response.body.items) {
      expect(hotel.leadPriceMinor).toBeGreaterThan(0);
      expect(Number.isInteger(hotel.leadPriceMinor)).toBe(true);
    }
  });

  it('rejects a check-out on or before check-in', async () => {
    await search({ checkOut: stay.checkIn }).expect(400);
    await search({ checkOut: addDays(stay.checkIn, -1) }).expect(400);
  });

  it('rejects a check-in in the past', async () => {
    await search({ checkIn: addDays(todayIso(), -1), checkOut: stay.checkOut }).expect(400);
  });

  it('rejects a malformed date', async () => {
    await search({ checkIn: '18-11-2026' }).expect(400);
  });

  it('rejects a stay longer than the supported maximum', async () => {
    await search({ checkOut: addDays(stay.checkIn, 45) }).expect(400);
  });

  it('rejects impossible occupancy', async () => {
    await search({ adults: 0 }).expect(400);
    await search({ rooms: 99 }).expect(400);
  });

  it('returns 404 for a destination with no demo inventory', async () => {
    await search({ destination: 'atlantis' }).expect(404);
  });

  it('sorts by price ascending on the real totals', async () => {
    const response = await search({ sort: 'price_asc', pageSize: 50 }).expect(200);
    const prices = response.body.items.map(
      (hotel: { leadPriceMinor: number }) => hotel.leadPriceMinor,
    );
    expect([...prices].sort((a: number, b: number) => a - b)).toEqual(prices);
  });

  it('sorts by guest rating descending', async () => {
    const response = await search({ sort: 'rating_desc', pageSize: 50 }).expect(200);
    const ratings = response.body.items.map((hotel: { guestRating: number }) => hotel.guestRating);
    expect([...ratings].sort((a: number, b: number) => b - a)).toEqual(ratings);
  });

  it('filters on actual data rather than only changing the response shape', async () => {
    const unfiltered = await search({ pageSize: 50 }).expect(200);
    const fiveStarCount = unfiltered.body.items.filter(
      (hotel: { starRating: number }) => hotel.starRating === 5,
    ).length;

    const filtered = await search({ starRatings: '5', pageSize: 50 }).expect(200);
    expect(filtered.body.total).toBe(fiveStarCount);
    for (const hotel of filtered.body.items) {
      expect(hotel.starRating).toBe(5);
    }
  });

  it('applies a maximum price filter to the lead total', async () => {
    const unfiltered = await search({ pageSize: 50, sort: 'price_asc' }).expect(200);
    const cheapest = unfiltered.body.items[0].leadPriceMinor;

    const filtered = await search({ maxPriceMinor: cheapest, pageSize: 50 }).expect(200);
    expect(filtered.body.total).toBeGreaterThan(0);
    for (const hotel of filtered.body.items) {
      expect(hotel.leadPriceMinor).toBeLessThanOrEqual(cheapest);
    }
  });

  it('filters on amenities using AND semantics', async () => {
    const filtered = await search({ amenities: 'POOL,SPA', pageSize: 50 }).expect(200);
    for (const hotel of filtered.body.items) {
      expect(hotel.amenities).toEqual(expect.arrayContaining(['POOL', 'SPA']));
    }
  });

  it('rejects an unknown amenity code rather than ignoring it', async () => {
    await search({ amenities: 'HELIPAD' }).expect(400);
  });

  it('paginates without overlapping between pages', async () => {
    const first = await search({ pageSize: 2, page: 1 }).expect(200);
    const second = await search({ pageSize: 2, page: 2 }).expect(200);

    const firstIds = first.body.items.map((hotel: { id: string }) => hotel.id);
    const secondIds = second.body.items.map((hotel: { id: string }) => hotel.id);
    expect(firstIds.filter((id: string) => secondIds.includes(id))).toHaveLength(0);
    expect(first.body.totalPages).toBe(Math.ceil(first.body.total / 2));
  });

  it('returns facet counts derived from the result set', async () => {
    const response = await search({ pageSize: 50 }).expect(200);
    const starSum = response.body.facets.starRatings.reduce(
      (total: number, entry: { count: number }) => total + entry.count,
      0,
    );
    expect(starSum).toBe(response.body.total);
  });

  it('exposes hotel detail with priced offers and MongoDB content', async () => {
    const response = await request(server())
      .get(`${API}/hotels/palolem-sands-resort`)
      .query({ checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: 1, adults: 2, children: 0 })
      .expect(200);

    expect(response.body.offers.length).toBeGreaterThan(0);
    expect(response.body.content?.destinationSlug).toBe('goa');

    for (const offer of response.body.offers) {
      const { price } = offer;
      const lineSum = price.lines.reduce(
        (total: number, line: { amountMinor: number }) => total + line.amountMinor,
        0,
      );
      expect(lineSum).toBe(price.totalMinor);
      expect(offer.roomsAvailable).toBeGreaterThan(0);
    }
  });

  it('returns 404 for an unknown hotel slug', async () => {
    await request(server())
      .get(`${API}/hotels/not-a-real-hotel`)
      .query({ checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: 1, adults: 2, children: 0 })
      .expect(404);
  });

  it('excludes rooms that cannot hold the requested occupancy', async () => {
    const small = await request(server())
      .get(`${API}/hotels/palolem-sands-resort`)
      .query({ checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: 1, adults: 2, children: 0 })
      .expect(200);

    const large = await request(server())
      .get(`${API}/hotels/palolem-sands-resort`)
      .query({ checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: 1, adults: 4, children: 1 })
      .expect(200);

    expect(large.body.offers.length).toBeLessThanOrEqual(small.body.offers.length);
    for (const offer of large.body.offers) {
      expect(offer.maxOccupancy).toBeGreaterThanOrEqual(5);
    }
  });
});
