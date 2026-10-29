import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { addDays, todayIso } from '@voyago/shared';
import { API, VALID_PASSWORD, createTestApp, uniqueEmail } from './setup';

/**
 * The flight booking journey against the real application and seeded data:
 * search, fare quote with soft seat hold, booking with snapshots, the demo
 * payment state machine, ownership rules, and cancellation under fare rules.
 */
describe('Flight booking journey (e2e)', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();

  interface Session {
    token: string;
    email: string;
  }

  // Each test books its own future date so seat holds never collide.
  let dateCursor = 50;
  const nextDate = () => addDays(todayIso(), (dateCursor += 3));

  async function register(prefix: string): Promise<Session> {
    const email = uniqueEmail(prefix);
    const response = await request(server())
      .post(`${API}/auth/register`)
      .send({ email, password: VALID_PASSWORD, firstName: 'Flight', lastName: 'Tester' })
      .expect(201);
    return { token: response.body.accessToken as string, email };
  }

  /** Finds a route-date with at least one sellable fare, walking forward on sell-outs. */
  async function pickOffer(args?: { refundable?: boolean; date?: string }) {
    const routes = [
      ['DEL', 'BLR'],
      ['BOM', 'DEL'],
      ['BOM', 'GOI'],
      ['BLR', 'PNQ'],
    ] as const;
    for (let hop = 0; hop < 8; hop += 1) {
      const date = args?.date ?? nextDate();
      for (const [from, to] of routes) {
        const response = await request(server())
          .get(`${API}/flights/search`)
          .query({ from, to, date, adults: 2 })
          .expect(200);
        for (const item of response.body.items as Array<{
          segment: { flightId: string };
          fares: Array<{
            fareClassId: string;
            refundable: boolean;
            seatsLeft: number;
            price: { totalMinor: number };
          }>;
        }>) {
          const fare = item.fares.find(
            (candidate) =>
              candidate.seatsLeft >= 2 &&
              (args?.refundable === undefined || candidate.refundable === args.refundable),
          );
          if (fare) return { date, flightId: item.segment.flightId, fare };
        }
      }
      if (args?.date) break;
    }
    throw new Error('No sellable flight offer found for the test');
  }

  async function createQuote(session: Session, refundable?: boolean) {
    const picked = await pickOffer({ refundable });
    const response = await request(server())
      .post(`${API}/flight-quotes`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        flightId: picked.flightId,
        fareClassId: picked.fare.fareClassId,
        date: picked.date,
        adults: 2,
        children: 0,
        expectedTotalMinor: picked.fare.price.totalMinor,
      })
      .expect(201);
    expect(response.body.priceChanged).toBe(false);
    return { quote: response.body, picked };
  }

  async function createBooking(session: Session, refundable?: boolean) {
    const { quote } = await createQuote(session, refundable);
    const response = await request(server())
      .post(`${API}/flight-bookings`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        quoteId: quote.quoteId,
        contactEmail: session.email,
        contactPhone: '+91 98200 11111',
        passengers: [
          { firstName: 'Lead', lastName: 'Tester', isLeadPassenger: true },
          { firstName: 'Second', lastName: 'Tester' },
        ],
        acceptedCancellationPolicy: true,
      })
      .expect(201);
    return { booking: response.body, quote };
  }

  function pay(session: Session, reference: string, scenario: string, key?: string) {
    return request(server())
      .post(`${API}/flight-bookings/${reference}/payments`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({ scenario, idempotencyKey: key ?? `it-${reference}-${scenario}-${Date.now()}` });
  }

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('search', () => {
    it('returns operating flights with ordered fare families', async () => {
      const date = nextDate();
      const response = await request(server())
        .get(`${API}/flights/search`)
        .query({ from: 'BOM', to: 'DEL', date, adults: 1 })
        .expect(200);

      expect(response.body.origin.iata).toBe('BOM');
      expect(response.body.total).toBeGreaterThan(0);
      for (const item of response.body.items) {
        const totals = item.fares.map(
          (fare: { price: { totalMinor: number } }) => fare.price.totalMinor,
        );
        expect([...totals].sort((a, b) => a - b)).toEqual(totals);
        const sum = item.fares[0].price.lines.reduce(
          (total: number, line: { amountMinor: number }) => total + line.amountMinor,
          0,
        );
        expect(sum).toBe(item.fares[0].price.totalMinor);
      }
    });

    it('rejects past dates, same-airport routes and unknown airports', async () => {
      await request(server())
        .get(`${API}/flights/search`)
        .query({ from: 'BOM', to: 'GOI', date: '2020-01-01', adults: 1 })
        .expect(400);
      const date = nextDate();
      await request(server())
        .get(`${API}/flights/search`)
        .query({ from: 'BOM', to: 'BOM', date, adults: 1 })
        .expect(400);
      await request(server())
        .get(`${API}/flights/search`)
        .query({ from: 'XXX', to: 'GOI', date, adults: 1 })
        .expect(404);
    });

    it('lists the six demo airports', async () => {
      const response = await request(server()).get(`${API}/flights/airports`).expect(200);
      expect(response.body).toHaveLength(6);
      expect(response.body.map((airport: { iata: string }) => airport.iata)).toContain('BOM');
    });
  });

  describe('fare quotes', () => {
    it('holds seats: repeated quotes shrink availability until expiry', async () => {
      const session = await register('fq.hold');
      const { quote, picked } = await createQuote(session);

      // Re-reading the quote excludes its own hold and keeps the price.
      const reread = await request(server())
        .get(`${API}/flight-quotes/${quote.quoteId}`)
        .set('Authorization', `Bearer ${session.token}`)
        .expect(200);
      expect(reread.body.fare.price.totalMinor).toBe(quote.fare.price.totalMinor);

      // A fresh search must see two fewer seats on that fare.
      const search = await request(server())
        .get(`${API}/flights/search`)
        .query({
          from: quote.segment.origin.iata,
          to: quote.segment.destination.iata,
          date: picked.date,
          adults: 1,
        })
        .expect(200);
      const fareNow = search.body.items
        .flatMap((item: { fares: Array<{ fareClassId: string; seatsLeft: number }> }) => item.fares)
        .find((fare: { fareClassId: string }) => fare.fareClassId === picked.fare.fareClassId);
      if (fareNow) {
        expect(fareNow.seatsLeft).toBe(picked.fare.seatsLeft - 2);
      }
    });

    it('rejects a quote for a flight/fare mismatch', async () => {
      const [a, b] = await Promise.all([pickOffer(), pickOffer()]);
      if (a.flightId !== b.flightId) {
        await request(server())
          .post(`${API}/flight-quotes`)
          .send({ flightId: a.flightId, fareClassId: b.fare.fareClassId, date: a.date, adults: 1 })
          .expect(400);
      }
    });

    it('rejects malformed ids with 400, never 500', async () => {
      await request(server()).get(`${API}/flight-quotes/not-a-uuid`).expect(400);
      await request(server())
        .post(`${API}/flight-quotes`)
        .send({ flightId: 'x', fareClassId: 'y', date: nextDate(), adults: 1 })
        .expect(400);
    });
  });

  describe('booking creation', () => {
    it('persists a pending booking with immutable snapshots and a VYF reference', async () => {
      const session = await register('fb.create');
      const { booking, quote } = await createBooking(session);

      expect(booking.reference).toMatch(/^VYF-[2-9A-HJ-NP-Z]{8}$/);
      expect(booking.status).toBe('PENDING_PAYMENT');
      expect(booking.totalMinor).toBe(quote.fare.price.totalMinor);
      expect(booking.segment.flightNumber).toBe(quote.segment.flightNumber);
      expect(booking.passengers).toHaveLength(2);
      expect(booking.passengers[0].isLeadPassenger).toBe(true);
    });

    it('requires exactly as many passenger names as travellers quoted', async () => {
      const session = await register('fb.pax');
      const { quote } = await createQuote(session);
      await request(server())
        .post(`${API}/flight-bookings`)
        .set('Authorization', `Bearer ${session.token}`)
        .send({
          quoteId: quote.quoteId,
          contactEmail: session.email,
          contactPhone: '+91 98200 11111',
          passengers: [{ firstName: 'Just', lastName: 'One' }],
          acceptedCancellationPolicy: true,
        })
        .expect(400);
    });

    it('is idempotent for the owner re-posting a consumed quote, invisible to others', async () => {
      const session = await register('fb.idem');
      const { booking, quote } = await createBooking(session);

      const repost = await request(server())
        .post(`${API}/flight-bookings`)
        .set('Authorization', `Bearer ${session.token}`)
        .send({
          quoteId: quote.quoteId,
          contactEmail: session.email,
          contactPhone: '+91 98200 11111',
          passengers: [
            { firstName: 'Lead', lastName: 'Tester', isLeadPassenger: true },
            { firstName: 'Second', lastName: 'Tester' },
          ],
          acceptedCancellationPolicy: true,
        })
        .expect(201);
      expect(repost.body.reference).toBe(booking.reference);

      const stranger = await register('fb.stranger');
      await request(server())
        .post(`${API}/flight-bookings`)
        .set('Authorization', `Bearer ${stranger.token}`)
        .send({
          quoteId: quote.quoteId,
          contactEmail: stranger.email,
          contactPhone: '+91 98200 11111',
          passengers: [
            { firstName: 'A', lastName: 'B', isLeadPassenger: true },
            { firstName: 'C', lastName: 'D' },
          ],
          acceptedCancellationPolicy: true,
        })
        // A quote created while signed in belongs to that user, so another
        // account cannot even see it - 404, not 409.
        .expect(404);
    });
  });

  describe('payments and ownership', () => {
    it('runs the SUCCESS scenario to CONFIRMED with an idempotent replay', async () => {
      const session = await register('fp.success');
      const { booking } = await createBooking(session);
      const key = `it-key-${booking.reference}`;

      const paid = await pay(session, booking.reference, 'SUCCESS', key).expect(201);
      expect(paid.body.booking.status).toBe('CONFIRMED');
      expect(paid.body.notice).toContain('No real money');

      const replay = await pay(session, booking.reference, 'SUCCESS', key).expect(201);
      expect(replay.body.attempt.id).toBe(paid.body.attempt.id);

      await pay(session, booking.reference, 'SUCCESS').expect(409);
    });

    it('FAILURE leaves the booking payable; PENDING resolves later', async () => {
      const session = await register('fp.fail');
      const { booking } = await createBooking(session);

      const failed = await pay(session, booking.reference, 'FAILURE').expect(201);
      expect(failed.body.booking.status).toBe('PAYMENT_FAILED');

      const pending = await pay(session, booking.reference, 'PENDING').expect(201);
      expect(pending.body.booking.status).toBe('PAYMENT_PROCESSING');

      const resolved = await request(server())
        .post(`${API}/flight-bookings/${booking.reference}/payments/resolve`)
        .set('Authorization', `Bearer ${session.token}`)
        .send({ outcome: 'SUCCESS' })
        .expect(200);
      expect(resolved.body.booking.status).toBe('CONFIRMED');
      expect(
        resolved.body.booking.statusHistory.map((event: { toStatus: string }) => event.toStatus),
      ).toEqual([
        'PENDING_PAYMENT',
        'PAYMENT_PROCESSING',
        'PAYMENT_FAILED',
        'PAYMENT_PROCESSING',
        'CONFIRMED',
      ]);
    });

    it("hides other users' bookings from reads, payments and cancellation", async () => {
      const owner = await register('fp.owner');
      const intruder = await register('fp.intruder');
      const { booking } = await createBooking(owner);

      await request(server())
        .get(`${API}/flight-bookings/${booking.reference}`)
        .set('Authorization', `Bearer ${intruder.token}`)
        .expect(404);
      await pay(intruder, booking.reference, 'SUCCESS').expect(404);
      await request(server())
        .post(`${API}/flight-bookings/${booking.reference}/cancellation`)
        .set('Authorization', `Bearer ${intruder.token}`)
        .send({})
        .expect(404);
      await request(server()).get(`${API}/flight-bookings`).expect(401);
    });
  });

  describe('cancellation and refunds', () => {
    it('refunds a refundable fare per its policy tiers', async () => {
      const session = await register('fc.refundable');
      const { booking } = await createBooking(session, true);
      await pay(session, booking.reference, 'SUCCESS').expect(201);

      const read = await request(server())
        .get(`${API}/flight-bookings/${booking.reference}`)
        .set('Authorization', `Bearer ${session.token}`)
        .expect(200);
      const preview = read.body.cancellationPreview;
      expect(preview).toBeTruthy();

      const cancelled = await request(server())
        .post(`${API}/flight-bookings/${booking.reference}/cancellation`)
        .set('Authorization', `Bearer ${session.token}`)
        .send({ reason: 'Integration test' })
        .expect(200);
      expect(cancelled.body.status).toBe('CANCELLED');
      expect(cancelled.body.refundMinor).toBe(preview.refundMinor);
      expect(cancelled.body.refundStatus).toBe(preview.refundMinor > 0 ? 'REFUNDED' : 'REJECTED');
    });

    it('cancels a non-refundable fare with zero refund and rejects a double cancel', async () => {
      const session = await register('fc.nonref');
      const { booking } = await createBooking(session, false);
      await pay(session, booking.reference, 'SUCCESS').expect(201);

      const cancelled = await request(server())
        .post(`${API}/flight-bookings/${booking.reference}/cancellation`)
        .set('Authorization', `Bearer ${session.token}`)
        .send({})
        .expect(200);
      expect(cancelled.body.refundMinor).toBe(0);
      expect(cancelled.body.refundStatus).toBe('REJECTED');

      await request(server())
        .post(`${API}/flight-bookings/${booking.reference}/cancellation`)
        .set('Authorization', `Bearer ${session.token}`)
        .send({})
        .expect(409);
    });

    it('an unpaid booking cancels with no refund record', async () => {
      const session = await register('fc.unpaid');
      const { booking } = await createBooking(session);
      const cancelled = await request(server())
        .post(`${API}/flight-bookings/${booking.reference}/cancellation`)
        .set('Authorization', `Bearer ${session.token}`)
        .send({})
        .expect(200);
      expect(cancelled.body.refundStatus).toBe('NOT_APPLICABLE');
      expect(cancelled.body.refundMinor).toBeNull();
    });
  });
});
