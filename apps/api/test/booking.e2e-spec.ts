import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { API, VALID_PASSWORD, createTestApp, futureStay, uniqueEmail } from './setup';

interface Session {
  token: string;
  email: string;
}

describe('Booking journey (e2e)', () => {
  let app: INestApplication;
  let customer: Session;
  let otherCustomer: Session;

  // Each quote softly holds inventory until it expires, so every test takes a
  // distinct stay window. Otherwise the suite would exhaust the room itself.
  let stayCursor = 0;
  const nextStay = () => futureStay(40 + (stayCursor += 2), 2);
  const stay = futureStay(30, 2);

  beforeAll(async () => {
    app = await createTestApp();
    customer = await signUp('booker');
    otherCustomer = await signUp('intruder');
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  async function signUp(prefix: string): Promise<Session> {
    const email = uniqueEmail(prefix);
    const response = await request(server())
      .post(`${API}/auth/register`)
      .send({ email, password: VALID_PASSWORD, firstName: 'Test', lastName: 'Traveller' })
      .expect(201);
    return { token: response.body.accessToken, email };
  }

  type TestOffer = {
    roomId: string;
    ratePlan: { id: string; cancellationPolicy: { code: string } };
    price: { totalMinor: number };
  };

  /** Fetches offers for one stay window, or null when the room is sold out. */
  async function offersFor(window: { checkIn: string; checkOut: string }, policyCode?: string) {
    const hotel = await request(server())
      .get(`${API}/hotels/cubbon-park-grand`)
      .query({
        checkIn: window.checkIn,
        checkOut: window.checkOut,
        rooms: 1,
        adults: 2,
        children: 0,
      })
      .expect(200);

    const offers = hotel.body.offers as TestOffer[];
    const offer = policyCode
      ? offers.find((item) => item.ratePlan.cancellationPolicy.code === policyCode)
      : offers[0];

    return offer ? { hotelId: hotel.body.id as string, offer, window } : null;
  }

  /**
   * Picks a bookable offer. A few seeded nights are deliberately sold out, so
   * this walks forward to the next window rather than failing the test.
   */
  async function pickOffer(policyCode?: string, window = stay) {
    let candidate = window;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const found = await offersFor(candidate, policyCode);
      if (found) return found;
      candidate = nextStay();
    }
    throw new Error(`No offer available for policy ${policyCode ?? 'any'} in 12 windows`);
  }

  async function createQuote(session: Session, policyCode?: string, requested = nextStay()) {
    const { hotelId, offer, window } = await pickOffer(policyCode, requested);
    const response = await request(server())
      .post(`${API}/quotes`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        hotelId,
        roomId: offer.roomId,
        ratePlanId: offer.ratePlan.id,
        checkIn: window.checkIn,
        checkOut: window.checkOut,
        rooms: 1,
        adults: 2,
        children: 0,
      })
      .expect(201);
    return response.body;
  }

  async function createBooking(session: Session, policyCode?: string) {
    const quote = await createQuote(session, policyCode);
    const response = await request(server())
      .post(`${API}/bookings`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        quoteId: quote.quoteId,
        contactEmail: session.email,
        contactPhone: '+91 98200 12345',
        guests: [{ firstName: 'Test', lastName: 'Traveller', isLeadGuest: true }],
        acceptedCancellationPolicy: true,
      })
      .expect(201);
    return { booking: response.body, quote };
  }

  const pay = (session: Session, reference: string, scenario: string, key = randomUUID()) =>
    request(server())
      .post(`${API}/bookings/${reference}/payments`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({ scenario, idempotencyKey: key });

  describe('price recheck', () => {
    it('issues a quote whose total matches the offer', async () => {
      const { hotelId, offer, window } = await pickOffer(undefined, nextStay());
      const response = await request(server())
        .post(`${API}/quotes`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          hotelId,
          roomId: offer.roomId,
          ratePlanId: offer.ratePlan.id,
          checkIn: window.checkIn,
          checkOut: window.checkOut,
          rooms: 1,
          adults: 2,
          children: 0,
          expectedTotalMinor: offer.price.totalMinor,
        })
        .expect(201);

      expect(response.body.offer.price.totalMinor).toBe(offer.price.totalMinor);
      expect(response.body.priceChanged).toBe(false);
      expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('ignores a client-supplied total instead of trusting it', async () => {
      const { hotelId, offer, window } = await pickOffer(undefined, nextStay());
      await request(server())
        .post(`${API}/quotes`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          hotelId,
          roomId: offer.roomId,
          ratePlanId: offer.ratePlan.id,
          checkIn: window.checkIn,
          checkOut: window.checkOut,
          rooms: 1,
          adults: 2,
          children: 0,
          totalMinor: 1,
        })
        .expect(400);
    });

    it('flags a price change without letting the old price stand', async () => {
      const { hotelId, offer, window } = await pickOffer(undefined, nextStay());
      const response = await request(server())
        .post(`${API}/quotes`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          hotelId,
          roomId: offer.roomId,
          ratePlanId: offer.ratePlan.id,
          checkIn: window.checkIn,
          checkOut: window.checkOut,
          rooms: 1,
          adults: 2,
          children: 0,
          expectedTotalMinor: 1,
        })
        .expect(201);

      expect(response.body.priceChanged).toBe(true);
      expect(response.body.offer.price.totalMinor).toBe(offer.price.totalMinor);
    });

    it('rejects a room that does not belong to the hotel', async () => {
      const { offer, window } = await pickOffer(undefined, nextStay());
      await request(server())
        .post(`${API}/quotes`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          hotelId: '00000000-0000-4000-8000-000000000000',
          roomId: offer.roomId,
          ratePlanId: offer.ratePlan.id,
          checkIn: window.checkIn,
          checkOut: window.checkOut,
          rooms: 1,
          adults: 2,
          children: 0,
        })
        .expect(400);
    });
  });

  describe('booking creation', () => {
    it('persists a pending booking with an immutable price snapshot', async () => {
      const { booking, quote } = await createBooking(customer);

      expect(booking.reference).toMatch(/^VYG-[2-9A-HJ-NP-Z]{8}$/);
      expect(booking.status).toBe('PENDING_PAYMENT');
      expect(booking.paymentStatus).toBe('INITIATED');
      expect(booking.totalMinor).toBe(quote.offer.price.totalMinor);
      expect(booking.priceSnapshot.totalMinor).toBe(quote.offer.price.totalMinor);
      expect(booking.statusHistory).toHaveLength(1);
    });

    it('refuses to reuse a quote for a second booking', async () => {
      const quote = await createQuote(customer);
      const payload = {
        quoteId: quote.quoteId,
        contactEmail: customer.email,
        contactPhone: '+91 98200 12345',
        guests: [{ firstName: 'Test', lastName: 'Traveller', isLeadGuest: true }],
        acceptedCancellationPolicy: true,
      };

      const first = await request(server())
        .post(`${API}/bookings`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send(payload)
        .expect(201);

      // A replayed submit returns the same booking rather than creating a second.
      const second = await request(server())
        .post(`${API}/bookings`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send(payload)
        .expect(201);

      expect(second.body.reference).toBe(first.body.reference);
    });

    it('requires the cancellation policy to be accepted', async () => {
      const quote = await createQuote(customer);
      await request(server())
        .post(`${API}/bookings`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          quoteId: quote.quoteId,
          contactEmail: customer.email,
          contactPhone: '+91 98200 12345',
          guests: [{ firstName: 'Test', lastName: 'Traveller', isLeadGuest: true }],
          acceptedCancellationPolicy: false,
        })
        .expect(400);
    });

    it('validates contact details', async () => {
      const quote = await createQuote(customer);
      await request(server())
        .post(`${API}/bookings`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          quoteId: quote.quoteId,
          contactEmail: 'not-an-email',
          contactPhone: 'abc',
          guests: [{ firstName: 'Test', lastName: 'Traveller', isLeadGuest: true }],
          acceptedCancellationPolicy: true,
        })
        .expect(400);
    });

    it('requires at least one guest', async () => {
      const quote = await createQuote(customer);
      await request(server())
        .post(`${API}/bookings`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          quoteId: quote.quoteId,
          contactEmail: customer.email,
          contactPhone: '+91 98200 12345',
          guests: [],
          acceptedCancellationPolicy: true,
        })
        .expect(400);
    });

    it('refuses an anonymous booking attempt', async () => {
      const quote = await createQuote(customer);
      await request(server())
        .post(`${API}/bookings`)
        .send({
          quoteId: quote.quoteId,
          contactEmail: customer.email,
          contactPhone: '+91 98200 12345',
          guests: [{ firstName: 'Test', lastName: 'Traveller', isLeadGuest: true }],
          acceptedCancellationPolicy: true,
        })
        .expect(401);
    });

    it('rejects a client attempt to set the booking status directly', async () => {
      const quote = await createQuote(customer);
      await request(server())
        .post(`${API}/bookings`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          quoteId: quote.quoteId,
          contactEmail: customer.email,
          contactPhone: '+91 98200 12345',
          guests: [{ firstName: 'Test', lastName: 'Traveller', isLeadGuest: true }],
          acceptedCancellationPolicy: true,
          status: 'CONFIRMED',
          paymentStatus: 'SUCCEEDED',
          totalMinor: 1,
        })
        .expect(400);
    });
  });

  describe('demo payments', () => {
    it('confirms a booking on a successful demo payment', async () => {
      const { booking } = await createBooking(customer);
      const response = await pay(customer, booking.reference, 'SUCCESS').expect(200);

      expect(response.body.booking.status).toBe('CONFIRMED');
      expect(response.body.booking.paymentStatus).toBe('SUCCEEDED');
      expect(response.body.notice).toContain('No real money is charged');
      expect(
        response.body.booking.statusHistory.map((e: { toStatus: string }) => e.toStatus),
      ).toEqual(['PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'CONFIRMED']);
    });

    it('records a failure and allows a retry', async () => {
      const { booking } = await createBooking(customer);

      const failed = await pay(customer, booking.reference, 'FAILURE').expect(200);
      expect(failed.body.booking.status).toBe('PAYMENT_FAILED');
      expect(failed.body.attempt.failureReason).toBeTruthy();

      const retried = await pay(customer, booking.reference, 'SUCCESS').expect(200);
      expect(retried.body.booking.status).toBe('CONFIRMED');
      expect(retried.body.booking.paymentAttempts).toHaveLength(2);
    });

    it('treats a replayed idempotency key as the original attempt', async () => {
      const { booking } = await createBooking(customer);
      const key = randomUUID();

      const first = await pay(customer, booking.reference, 'FAILURE', key).expect(200);
      // Same key, different scenario: the original result must win.
      const replay = await pay(customer, booking.reference, 'SUCCESS', key).expect(200);

      expect(replay.body.booking.status).toBe(first.body.booking.status);
      expect(replay.body.booking.paymentAttempts).toHaveLength(1);
      expect(replay.body.attempt.id).toBe(first.body.attempt.id);
    });

    it('holds a pending payment until it is resolved', async () => {
      const { booking } = await createBooking(customer);

      const pending = await pay(customer, booking.reference, 'PENDING').expect(200);
      expect(pending.body.booking.status).toBe('PAYMENT_PROCESSING');
      expect(pending.body.booking.paymentStatus).toBe('PENDING');

      const resolved = await request(server())
        .post(`${API}/bookings/${booking.reference}/payments/resolve`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ outcome: 'SUCCESS' })
        .expect(200);

      expect(resolved.body.booking.status).toBe('CONFIRMED');
      expect(resolved.body.booking.paymentStatus).toBe('SUCCEEDED');
    });

    it('resolves a pending payment as a failure when asked', async () => {
      const { booking } = await createBooking(customer);
      await pay(customer, booking.reference, 'PENDING').expect(200);

      const resolved = await request(server())
        .post(`${API}/bookings/${booking.reference}/payments/resolve`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ outcome: 'FAILURE' })
        .expect(200);

      expect(resolved.body.booking.status).toBe('PAYMENT_FAILED');
    });

    it('refuses to resolve a booking that has no pending payment', async () => {
      const { booking } = await createBooking(customer);
      await request(server())
        .post(`${API}/bookings/${booking.reference}/payments/resolve`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ outcome: 'SUCCESS' })
        .expect(409);
    });

    it('refuses a second payment on a confirmed booking', async () => {
      const { booking } = await createBooking(customer);
      await pay(customer, booking.reference, 'SUCCESS').expect(200);
      await pay(customer, booking.reference, 'SUCCESS').expect(409);
    });

    it('rejects an unknown payment scenario', async () => {
      const { booking } = await createBooking(customer);
      await pay(customer, booking.reference, 'FREE_HOLIDAY').expect(400);
    });

    it('never echoes card-like fields back to the client', async () => {
      const { booking } = await createBooking(customer);
      await request(server())
        .post(`${API}/bookings/${booking.reference}/payments`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          scenario: 'SUCCESS',
          idempotencyKey: randomUUID(),
          cardNumber: '4111111111111111',
        })
        .expect(400);
    });
  });

  describe('authorization', () => {
    it('hides another customer booking behind a 404', async () => {
      const { booking } = await createBooking(customer);

      await request(server())
        .get(`${API}/bookings/${booking.reference}`)
        .set('Authorization', `Bearer ${otherCustomer.token}`)
        .expect(404);

      await request(server())
        .get(`${API}/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${otherCustomer.token}`)
        .expect(404);
    });

    it('stops another customer paying for or cancelling a booking', async () => {
      const { booking } = await createBooking(customer);

      await pay(otherCustomer, booking.reference, 'SUCCESS').expect(404);
      await request(server())
        .post(`${API}/bookings/${booking.reference}/cancellation`)
        .set('Authorization', `Bearer ${otherCustomer.token}`)
        .send({})
        .expect(404);
    });

    it('lists only the caller own bookings', async () => {
      const { booking } = await createBooking(customer);
      const response = await request(server())
        .get(`${API}/bookings`)
        .set('Authorization', `Bearer ${otherCustomer.token}`)
        .expect(200);

      const references = response.body.items.map((item: { reference: string }) => item.reference);
      expect(references).not.toContain(booking.reference);
    });
  });

  describe('cancellation and refund simulation', () => {
    it('refunds a refundable rate in full well before check-in', async () => {
      const { booking } = await createBooking(customer, 'FREE_48H');
      await pay(customer, booking.reference, 'SUCCESS').expect(200);

      const cancelled = await request(server())
        .post(`${API}/bookings/${booking.reference}/cancellation`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ reason: 'Plans changed' })
        .expect(200);

      expect(cancelled.body.status).toBe('CANCELLED');
      expect(cancelled.body.refundStatus).toBe('REFUNDED');
      expect(cancelled.body.refundMinor).toBe(booking.totalMinor);
    });

    it('refunds nothing on a non-refundable rate', async () => {
      const { booking } = await createBooking(customer, 'NON_REFUNDABLE');
      await pay(customer, booking.reference, 'SUCCESS').expect(200);

      const cancelled = await request(server())
        .post(`${API}/bookings/${booking.reference}/cancellation`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({})
        .expect(200);

      expect(cancelled.body.status).toBe('CANCELLED');
      expect(cancelled.body.refundStatus).toBe('REJECTED');
      expect(cancelled.body.refundMinor).toBe(0);
    });

    it('refunds nothing when the booking was never paid', async () => {
      const { booking } = await createBooking(customer, 'FREE_48H');

      const cancelled = await request(server())
        .post(`${API}/bookings/${booking.reference}/cancellation`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({})
        .expect(200);

      expect(cancelled.body.refundStatus).toBe('NOT_APPLICABLE');
      expect(cancelled.body.refundMinor).toBeNull();
    });

    it('refuses to cancel the same booking twice', async () => {
      const { booking } = await createBooking(customer, 'FREE_48H');
      await pay(customer, booking.reference, 'SUCCESS').expect(200);

      await request(server())
        .post(`${API}/bookings/${booking.reference}/cancellation`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({})
        .expect(200);

      await request(server())
        .post(`${API}/bookings/${booking.reference}/cancellation`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({})
        .expect(409);
    });

    it('refuses a payment on a cancelled booking', async () => {
      const { booking } = await createBooking(customer, 'FREE_48H');
      await request(server())
        .post(`${API}/bookings/${booking.reference}/cancellation`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({})
        .expect(200);

      await pay(customer, booking.reference, 'SUCCESS').expect(409);
    });
  });

  describe('persistence', () => {
    it('reads a confirmed booking back by reference and by id', async () => {
      const { booking } = await createBooking(customer);
      await pay(customer, booking.reference, 'SUCCESS').expect(200);

      const byReference = await request(server())
        .get(`${API}/bookings/${booking.reference}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      const byId = await request(server())
        .get(`${API}/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      expect(byReference.body.id).toBe(byId.body.id);
      expect(byReference.body.status).toBe('CONFIRMED');
      expect(byReference.body.guests).toHaveLength(1);
      expect(byReference.body.paymentAttempts.length).toBeGreaterThan(0);
    });

    it('returns 404 for a reference that does not exist', async () => {
      await request(server())
        .get(`${API}/bookings/VYG-ZZZZZZZZ`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(404);
    });
  });
});
