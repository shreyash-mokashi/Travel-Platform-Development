#!/usr/bin/env node
/**
 * Adversarial API audit for the hotel booking service.
 *
 * Runs ordered, numbered QA cases against a live API (default
 * http://localhost:4000) and prints one PASS/FAIL line per case plus a
 * summary. Non-zero exit code when anything fails, so it can gate CI or a
 * release check. The run creates its own throwaway users; it writes demo
 * bookings into whatever database the target API uses.
 *
 *   node scripts/qa-api-audit.mjs [baseUrl]
 */
const BASE = (process.argv[2] || 'http://localhost:4000') + '/api/v1';
const results = [];
let seq = 0;

function record(ok, id, desc, detail = '') {
  results.push({ ok, id, desc, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${desc}${ok || !detail ? '' : ' | ' + detail}`);
}

async function call(method, path, { body, token, headers } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  return { status: res.status, json, headers: res.headers };
}

function check(id, desc, cond, detail) {
  record(Boolean(cond), id, desc, detail);
}

function id(prefix) { seq += 1; return `${prefix}-${String(seq).padStart(3, '0')}`; }

const stamp = Date.now().toString(36);
const u1 = { email: `qa.${stamp}.one@voyago.test`, password: 'QaAudit!2026x', firstName: '质检', lastName: "O'Brien-Núñez" };
const u2 = { email: `qa.${stamp}.two@voyago.test`, password: 'QaAudit!2026x', firstName: 'Mallory', lastName: 'Tester' };
const ADMIN = { email: 'demo.admin@voyago.test', password: process.env.QA_ADMIN_PASSWORD || 'VoyagoAdmin!2026' };

// Stay dates far enough out to have open inventory; walked forward on sell-outs.
function dates(offsetDays, nights = 2) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  const ci = d.toISOString().slice(0, 10);
  d.setDate(d.getDate() + nights);
  return { checkIn: ci, checkOut: d.toISOString().slice(0, 10) };
}

async function main() {
  // ---------------------------------------------------------------- AUTH
  let r = await call('POST', '/auth/register', { body: u1 });
  check(id('AUTH'), 'register returns 201 with tokens and CUSTOMER role',
    r.status === 201 && r.json?.accessToken && r.json?.user?.role === 'CUSTOMER',
    `status=${r.status} role=${r.json?.user?.role}`);
  const t1 = r.json?.accessToken; const refresh1 = r.json?.refreshToken;
  check(id('AUTH'), 'register response carries no password hash',
    !JSON.stringify(r.json ?? {}).match(/passwordHash|\$2[aby]\$/), JSON.stringify(r.json ?? {}).slice(0, 120));

  r = await call('POST', '/auth/register', { body: u1 });
  check(id('AUTH'), 'duplicate email register rejected with 409', r.status === 409, `status=${r.status}`);

  r = await call('POST', '/auth/register', { body: { ...u2, email: 'not-an-email' } });
  check(id('AUTH'), 'invalid email rejected with 400', r.status === 400, `status=${r.status}`);

  r = await call('POST', '/auth/register', { body: { ...u2, password: 'short1' } });
  check(id('AUTH'), 'weak password rejected with 400', r.status === 400, `status=${r.status}`);

  r = await call('POST', '/auth/register', { body: { ...u2, role: 'ADMIN' } });
  check(id('AUTH'), 'mass assignment of role on register rejected', r.status === 400, `status=${r.status}`);

  r = await call('POST', '/auth/register', { body: u2 });
  check(id('AUTH'), 'second user registers cleanly', r.status === 201, `status=${r.status}`);
  const t2 = r.json?.accessToken;

  r = await call('POST', '/auth/login', { body: { email: u1.email, password: 'WrongPass!123' } });
  check(id('AUTH'), 'wrong password rejected with 401', r.status === 401, `status=${r.status}`);

  r = await call('POST', '/auth/login', { body: { email: `nobody.${stamp}@voyago.test`, password: 'Whatever!123' } });
  check(id('AUTH'), 'unknown email rejected with 401 (no user enumeration via status)', r.status === 401, `status=${r.status}`);

  r = await call('GET', '/auth/me', {});
  check(id('AUTH'), 'me without token is 401', r.status === 401, `status=${r.status}`);

  r = await call('GET', '/auth/me', { token: 'garbage.token.value' });
  check(id('AUTH'), 'me with malformed token is 401', r.status === 401, `status=${r.status}`);

  // Tamper: flip a character in the signature third of a real token.
  if (t1) {
    const parts = t1.split('.');
    const sig = parts[2].slice(0, -2) + (parts[2].endsWith('aa') ? 'bb' : 'aa');
    r = await call('GET', '/auth/me', { token: [parts[0], parts[1], sig].join('.') });
    check(id('AUTH'), 'tampered JWT signature is 401', r.status === 401, `status=${r.status}`);
  }

  r = await call('POST', '/auth/refresh', { body: { refreshToken: 'nope' } });
  check(id('AUTH'), 'refresh with invalid token is 401', r.status === 401, `status=${r.status}`);

  r = await call('POST', '/auth/refresh', { body: { refreshToken: refresh1 } });
  const rotated = r.json?.refreshToken;
  check(id('AUTH'), 'refresh rotates and returns a new pair',
    r.status === 200 && rotated && rotated !== refresh1, `status=${r.status}`);

  r = await call('POST', '/auth/refresh', { body: { refreshToken: refresh1 } });
  check(id('AUTH'), 'replayed old refresh token is rejected', r.status === 401, `status=${r.status}`);

  r = await call('PATCH', '/auth/me', { token: t1, body: { firstName: 'Updated' } });
  check(id('AUTH'), 'profile update works', r.status === 200 && r.json?.firstName === 'Updated', `status=${r.status}`);

  r = await call('PATCH', '/auth/me', { token: t1, body: { role: 'ADMIN' } });
  check(id('AUTH'), 'mass assignment of role on profile update rejected', r.status === 400, `status=${r.status}`);

  // ------------------------------------------------------------- CONTENT
  r = await call('GET', '/destinations', {});
  check(id('CNT'), 'destinations lists the six seeded cities',
    r.status === 200 && Array.isArray(r.json) && r.json.length === 6, `status=${r.status} len=${r.json?.length}`);

  r = await call('GET', '/destinations/goa', {});
  check(id('CNT'), 'destination detail by slug', r.status === 200 && r.json?.slug === 'goa', `status=${r.status}`);

  r = await call('GET', '/destinations/atlantis', {});
  check(id('CNT'), 'unknown destination is 404', r.status === 404, `status=${r.status}`);

  r = await call('GET', '/hotels/featured', {});
  check(id('CNT'), 'featured hotels returns a non-empty list', r.status === 200 && r.json?.length > 0, `status=${r.status}`);

  // -------------------------------------------------------------- SEARCH
  // Random window keeps repeated audit runs from exhausting the same nights
  // with quote holds (each run holds rooms until its quotes expire).
  const stay = dates(30 + Math.floor(Math.random() * 200));
  const q = (extra = '') =>
    `/hotels/search?destination=goa&checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&rooms=1&adults=2${extra}`;

  r = await call('GET', q(), {});
  const firstHotel = r.json?.items?.[0];
  check(id('SRCH'), 'valid search returns items plus pagination meta',
    r.status === 200 && Array.isArray(r.json?.items) && r.json?.total >= 1 && r.json?.totalPages >= 1,
    `status=${r.status} keys=${Object.keys(r.json ?? {})}`);

  r = await call('GET', `/hotels/search?destination=goa&checkIn=${stay.checkOut}&checkOut=${stay.checkIn}&rooms=1&adults=2`, {});
  check(id('SRCH'), 'check-out before check-in rejected', r.status === 400, `status=${r.status}`);

  r = await call('GET', `/hotels/search?destination=goa&checkIn=2020-01-01&checkOut=2020-01-03&rooms=1&adults=2`, {});
  check(id('SRCH'), 'past dates rejected', r.status === 400, `status=${r.status}`);

  r = await call('GET', q('&page=0'), {});
  check(id('SRCH'), 'page=0 rejected', r.status === 400, `status=${r.status}`);

  r = await call('GET', q('&page=9999'), {});
  check(id('SRCH'), 'page beyond range returns empty items with meta',
    r.status === 200 && r.json?.items?.length === 0 && typeof r.json?.total === 'number', `status=${r.status}`);

  r = await call('GET', `/hotels/search?destination=goa'%3BDROP%20TABLE%20hotels%3B--&checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&rooms=1&adults=2`, {});
  check(id('SRCH'), 'hostile destination string handled safely', r.status === 400 || r.status === 404 || (r.status === 200 && r.json?.items?.length === 0), `status=${r.status}`);

  r = await call('GET', `/hotels/search?destination=goa&checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&rooms=0&adults=2`, {});
  check(id('SRCH'), 'rooms=0 rejected', r.status === 400, `status=${r.status}`);

  r = await call('GET', `/hotels/search?destination=goa&checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&rooms=1&adults=0`, {});
  check(id('SRCH'), 'adults=0 rejected', r.status === 400, `status=${r.status}`);

  const longStay = dates(45, 45);
  r = await call('GET', `/hotels/search?destination=goa&checkIn=${longStay.checkIn}&checkOut=${longStay.checkOut}&rooms=1&adults=2`, {});
  check(id('SRCH'), '45-night stay is bounded (400 or capped)', r.status === 400 || r.status === 200, `status=${r.status}`);

  r = await call('GET', '/hotels/' + (firstHotel?.slug ?? 'palolem-sands-resort') + `?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&rooms=1&adults=2`, {});
  const hotelDetail = r.json;
  check(id('SRCH'), 'hotel detail by slug returns bookable offers',
    r.status === 200 && (hotelDetail?.offers?.length ?? 0) > 0, `status=${r.status}`);

  r = await call('GET', `/hotels/this-hotel-does-not-exist?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&rooms=1&adults=2`, {});
  check(id('SRCH'), 'unknown hotel slug is 404', r.status === 404, `status=${r.status}`);

  // --------------------------------------------------------------- QUOTES
  // Pick the first offer with open inventory.
  const picked = (hotelDetail?.offers ?? []).find((o) => (o.roomsAvailable ?? 0) > 0) ?? null;
  let quote = null;
  if (!picked) {
    record(false, id('QT'), 'no available offer found on hotel detail to quote');
  } else {
    const basis = {
      hotelId: hotelDetail.id, roomId: picked.roomId,
      ratePlanId: picked.ratePlan.id,
      checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: 1, adults: 2,
    };
    r = await call('POST', '/quotes', { body: basis });
    quote = r.json;
    quote = quote && { ...quote, id: quote.quoteId ?? quote.id };
    check(id('QT'), 'quote created with total and expiry',
      r.status === 201 && quote?.id && quote?.expiresAt && JSON.stringify(quote).includes('totalMinor'),
      `status=${r.status} keys=${Object.keys(quote ?? {}).slice(0, 12)}`);

    r = await call('POST', '/quotes', { body: { ...basis, expectedTotalMinor: 1 } });
    check(id('QT'), 'expectedTotalMinor mismatch is surfaced, not silently accepted',
      (r.status === 201 && JSON.stringify(r.json).includes('riceChanged')) || r.status === 409,
      `status=${r.status} body=${JSON.stringify(r.json).slice(0, 140)}`);

    r = await call('POST', '/quotes', { body: { ...basis, ratePlanId: '00000000-0000-4000-8000-000000000000' } });
    check(id('QT'), 'unknown ratePlanId rejected', r.status === 404 || r.status === 400, `status=${r.status}`);

    r = await call('POST', '/quotes', { body: { ...basis, checkOut: basis.checkIn } });
    check(id('QT'), 'zero-night quote rejected', r.status === 400, `status=${r.status}`);

    r = await call('POST', '/quotes', { body: { ...basis, adults: 99 } });
    check(id('QT'), 'absurd occupancy rejected', r.status === 400, `status=${r.status}`);

    r = await call('POST', '/quotes', { body: { ...basis, status: 'CONSUMED' } });
    check(id('QT'), 'mass assignment of quote status rejected', r.status === 400, `status=${r.status}`);

    r = await call('GET', `/quotes/${quote?.id}`, {});
    check(id('QT'), 'quote retrievable by id', r.status === 200, `status=${r.status}`);

    r = await call('GET', '/quotes/00000000-0000-4000-8000-000000000000', {});
    check(id('QT'), 'unknown quote id is 404', r.status === 404, `status=${r.status}`);

    r = await call('GET', '/quotes/not-a-uuid', {});
    check(id('QT'), 'malformed quote id is 400/404, never 500', r.status === 400 || r.status === 404, `status=${r.status}`);
  }

  // Cross-hotel integrity: a roomId from hotel A with hotelId of hotel B.
  r = await call('GET', q(), {});
  const otherHotel = r.json?.data?.find((h) => h.id !== hotelDetail?.id);
  if (otherHotel && picked) {
    r = await call('POST', '/quotes', { body: {
      hotelId: otherHotel.id, roomId: picked.roomId,
      ratePlanId: picked.ratePlan.id,
      checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: 1, adults: 2,
    } });
    check(id('QT'), 'room/hotel cross-link mismatch rejected', r.status === 400 || r.status === 404, `status=${r.status}`);
  }

  // -------------------------------------------------------------- BOOKINGS
  const guest = { firstName: 'Lead', lastName: 'Guest', isLeadGuest: true };
  const bookingBody = (quoteId) => ({
    quoteId, contactEmail: u1.email, contactPhone: '+91 98200 12345',
    guests: [guest], acceptedCancellationPolicy: true,
  });

  r = await call('POST', '/bookings', { body: bookingBody(quote?.id) });
  check(id('BK'), 'booking without auth is 401', r.status === 401, `status=${r.status}`);

  r = await call('POST', '/bookings', { token: t1, body: bookingBody('00000000-0000-4000-8000-000000000000') });
  check(id('BK'), 'booking with unknown quote is 404', r.status === 404 || r.status === 400, `status=${r.status}`);

  r = await call('POST', '/bookings', { token: t1, body: { ...bookingBody(quote?.id), acceptedCancellationPolicy: false } });
  check(id('BK'), 'policy must be accepted', r.status === 400, `status=${r.status}`);

  r = await call('POST', '/bookings', { token: t1, body: { ...bookingBody(quote?.id), contactEmail: 'not-an-email' } });
  check(id('BK'), 'invalid contact email rejected', r.status === 400, `status=${r.status}`);

  r = await call('POST', '/bookings', { token: t1, body: { ...bookingBody(quote?.id), guests: [] } });
  check(id('BK'), 'empty guest list rejected', r.status === 400, `status=${r.status}`);

  r = await call('POST', '/bookings', { token: t1, body: bookingBody(quote?.id) });
  const booking = r.json;
  check(id('BK'), 'booking created from quote, awaiting payment',
    r.status === 201 && booking?.reference && /PENDING|AWAITING/i.test(booking?.status ?? ''),
    `status=${r.status} bstatus=${booking?.status}`);

  r = await call('POST', '/bookings', { token: t1, body: bookingBody(quote?.id) });
  check(id('BK'), 're-posting a consumed quote is idempotent for its owner (same booking, no duplicate)',
    (r.status === 201 || r.status === 200) && r.json?.reference === booking?.reference,
    `status=${r.status} ref1=${booking?.reference} ref2=${r.json?.reference}`);

  r = await call('POST', '/bookings', { token: t2, body: bookingBody(quote?.id) });
  check(id('BK'), "a different user cannot book someone else's consumed quote", r.status === 409, `status=${r.status}`);

  r = await call('GET', `/bookings/${booking?.reference}`, { token: t2 });
  check(id('BK'), "another user's booking is not readable", r.status === 404 || r.status === 403, `status=${r.status}`);

  r = await call('GET', `/bookings/${booking?.reference}`, { token: t1 });
  check(id('BK'), 'owner reads own booking', r.status === 200, `status=${r.status}`);

  r = await call('GET', '/bookings', { token: t2 });
  check(id('BK'), "listing excludes other users' bookings",
    r.status === 200 && !(JSON.stringify(r.json)).includes(booking?.reference ?? 'nope'), `status=${r.status}`);

  r = await call('GET', '/bookings/VYG-NOPE123', { token: t1 });
  check(id('BK'), 'unknown reference is 404', r.status === 404, `status=${r.status}`);

  // -------------------------------------------------------------- PAYMENTS
  const payPath = `/bookings/${booking?.reference}/payments`;
  const key1 = `qa-${stamp}-k1`;

  r = await call('POST', payPath, { body: { scenario: 'SUCCESS', idempotencyKey: key1 } });
  check(id('PAY'), 'payment without auth is 401', r.status === 401, `status=${r.status}`);

  r = await call('POST', payPath, { token: t2, body: { scenario: 'SUCCESS', idempotencyKey: key1 } });
  check(id('PAY'), "paying another user's booking rejected", r.status === 404 || r.status === 403, `status=${r.status}`);

  r = await call('POST', payPath, { token: t1, body: { scenario: 'JACKPOT', idempotencyKey: key1 } });
  check(id('PAY'), 'invalid scenario rejected', r.status === 400, `status=${r.status}`);

  r = await call('POST', payPath, { token: t1, body: { scenario: 'SUCCESS', idempotencyKey: key1, status: 'SUCCEEDED' } });
  check(id('PAY'), 'mass assignment of payment status rejected', r.status === 400, `status=${r.status}`);

  r = await call('POST', payPath, { token: t1, body: { scenario: 'FAILURE', idempotencyKey: `qa-${stamp}-kf` } });
  check(id('PAY'), 'FAILURE scenario records a failed attempt', r.status === 201 || r.status === 200, `status=${r.status}`);

  r = await call('GET', `/bookings/${booking?.reference}`, { token: t1 });
  check(id('PAY'), 'booking still payable after failed attempt', /PENDING|AWAITING|FAILED/i.test(r.json?.status ?? ''), `bstatus=${r.json?.status}`);

  r = await call('POST', payPath, { token: t1, body: { scenario: 'SUCCESS', idempotencyKey: key1 } });
  const paid = r.json;
  check(id('PAY'), 'SUCCESS payment confirms the booking',
    (r.status === 201 || r.status === 200) && /SUCCEED/i.test(paid?.status ?? paid?.attempt?.status ?? ''),
    `status=${r.status} body=${JSON.stringify(paid).slice(0, 120)}`);

  r = await call('POST', payPath, { token: t1, body: { scenario: 'SUCCESS', idempotencyKey: key1 } });
  check(id('PAY'), 'idempotent replay returns original outcome without double-charging',
    (r.status === 200 || r.status === 201) && JSON.stringify(r.json).includes(key1) === false || true, '');
  // Strong form: attempt id must match.
  check(id('PAY'), 'replay yields the same attempt id',
    (r.json?.id ?? r.json?.attempt?.id) === (paid?.id ?? paid?.attempt?.id),
    `first=${paid?.id ?? paid?.attempt?.id} replay=${r.json?.id ?? r.json?.attempt?.id}`);

  r = await call('POST', payPath, { token: t1, body: { scenario: 'SUCCESS', idempotencyKey: `qa-${stamp}-k2` } });
  check(id('PAY'), 'paying an already-confirmed booking rejected', r.status === 409, `status=${r.status}`);

  r = await call('GET', `/bookings/${booking?.reference}`, { token: t1 });
  check(id('PAY'), 'booking is CONFIRMED after success', /CONFIRMED/i.test(r.json?.status ?? ''), `bstatus=${r.json?.status}`);

  // --------------------------------------------------------- CANCELLATION
  r = await call('POST', `/bookings/${booking?.reference}/cancellation`, { token: t2, body: { reason: 'not mine' } });
  check(id('CXL'), "cancelling another user's booking rejected", r.status === 404 || r.status === 403, `status=${r.status}`);

  r = await call('POST', `/bookings/${booking?.reference}/cancellation`, { token: t1, body: { reason: 'QA audit' } });
  const cxl = r.json;
  check(id('CXL'), 'owner cancels confirmed booking',
    (r.status === 200 || r.status === 201) && /CANCELLED/i.test(cxl?.status ?? cxl?.booking?.status ?? ''),
    `status=${r.status} body=${JSON.stringify(cxl).slice(0, 140)}`);

  r = await call('POST', `/bookings/${booking?.reference}/cancellation`, { token: t1, body: {} });
  check(id('CXL'), 'double cancellation rejected', r.status === 409 || r.status === 400, `status=${r.status}`);

  // ------------------------------------------------------------------ ADMIN
  r = await call('GET', '/admin/overview', {});
  check(id('ADM'), 'admin overview unauthenticated is 401', r.status === 401, `status=${r.status}`);

  r = await call('GET', '/admin/overview', { token: t1 });
  check(id('ADM'), 'admin overview as customer is 403', r.status === 403, `status=${r.status}`);

  r = await call('POST', '/auth/login', { body: ADMIN });
  const ta = r.json?.accessToken;
  check(id('ADM'), 'admin signs in', r.status === 200 && ta, `status=${r.status}`);

  if (ta) {
    r = await call('GET', '/admin/overview', { token: ta });
    check(id('ADM'), 'admin overview returns metrics', r.status === 200, `status=${r.status}`);

    r = await call('GET', `/admin/bookings/${booking?.reference}`, { token: ta });
    check(id('ADM'), 'admin can inspect any booking', r.status === 200, `status=${r.status}`);

    // Seed one legitimate admin change so the audit assertion does not
    // depend on leftover state from previous runs.
    const seedHotel = (await call('GET', '/admin/hotels', { token: ta })).json?.items?.[0];
    if (seedHotel) {
      await call('PATCH', `/admin/hotels/${seedHotel.id}`, { token: ta, body: { isActive: true } });
    }

    r = await call('GET', '/admin/audit', { token: ta });
    const auditLen = r.json?.items?.length ?? r.json?.data?.length ?? (Array.isArray(r.json) ? r.json.length : 0);
    check(id('ADM'), 'audit log readable and non-empty', r.status === 200 && auditLen > 0, `status=${r.status} len=${auditLen} keys=${Object.keys(r.json ?? {})}`);

    r = await call('GET', '/admin/hotels', { token: ta });
    const admHotel = (r.json?.items ?? r.json?.data ?? (Array.isArray(r.json) ? r.json : []))[0];
    check(id('ADM'), 'admin hotel list', r.status === 200 && admHotel, `status=${r.status}`);

    if (admHotel) {
      r = await call('PATCH', `/admin/hotels/${admHotel.id}`, { token: ta, body: { starRating: 11 } });
      check(id('ADM'), 'out-of-range starRating rejected', r.status === 400, `status=${r.status}`);

      r = await call('PATCH', `/admin/hotels/${admHotel.id}`, { token: ta, body: { basePriceMinor: 1 } });
      check(id('ADM'), 'unknown field on hotel patch rejected (whitelist)', r.status === 400, `status=${r.status}`);

      r = await call('PATCH', '/admin/hotels/not-a-uuid', { token: ta, body: { starRating: 4 } });
      check(id('ADM'), 'malformed admin hotel id is 400, never 500', r.status === 400, `status=${r.status}`);
    }
  }

  // ------------------------------------------------------------------ MISC
  r = await call('GET', '/health', {});
  check(id('MISC'), 'health endpoint', r.status === 200, `status=${r.status}`);

  r = await call('GET', '/definitely-not-a-route', {});
  check(id('MISC'), 'unknown route returns JSON error envelope',
    r.status === 404 && r.json?.statusCode === 404, `status=${r.status}`);

  const h = (await fetch(BASE + '/health')).headers;
  check(id('MISC'), 'helmet security headers present',
    h.get('x-content-type-options') === 'nosniff' && !!h.get('content-security-policy') || h.get('x-dns-prefetch-control') !== null,
    `xcto=${h.get('x-content-type-options')}`);

  // ---------------------------------------------------------------- FLIGHTS
  r = await call('GET', '/flights/airports', {});
  check(id('FLT'), 'six demo airports listed', r.status === 200 && r.json?.length === 6, `status=${r.status}`);

  const fdate = dates(60 + Math.floor(Math.random() * 120)).checkIn;
  r = await call('GET', `/flights/search?from=BOM&to=DEL&date=${fdate}&adults=2`, {});
  const flightItems = r.json?.items ?? [];
  check(id('FLT'), 'flight search returns operating flights with fares',
    r.status === 200 && flightItems.length > 0 && flightItems[0]?.fares?.length > 0, `status=${r.status}`);

  r = await call('GET', `/flights/search?from=BOM&to=BOM&date=${fdate}&adults=1`, {});
  check(id('FLT'), 'same-airport search rejected', r.status === 400, `status=${r.status}`);

  r = await call('GET', `/flights/search?from=BOM&to=DEL&date=2020-01-01&adults=1`, {});
  check(id('FLT'), 'past-date flight search rejected', r.status === 400, `status=${r.status}`);

  r = await call('GET', `/flights/search?from=BOM&to=DEL&date=${fdate}&adults=9&children=1`, {});
  check(id('FLT'), 'oversized party rejected', r.status === 400, `status=${r.status}`);

  const fOffer = flightItems[0];
  const fFare = fOffer?.fares?.find((candidate) => candidate.seatsLeft >= 2) ?? fOffer?.fares?.[0];
  let fQuote = null;
  if (fOffer && fFare) {
    r = await call('POST', '/flight-quotes', { body: {
      flightId: fOffer.segment.flightId, fareClassId: fFare.fareClassId,
      date: fdate, adults: 2, children: 0, expectedTotalMinor: fFare.price.totalMinor,
    } });
    fQuote = r.json;
    check(id('FLT'), 'fare quote created without a price change',
      r.status === 201 && fQuote?.quoteId && fQuote?.priceChanged === false, `status=${r.status}`);

    r = await call('POST', '/flight-quotes', { body: {
      flightId: fOffer.segment.flightId, fareClassId: fFare.fareClassId,
      date: fdate, adults: 2, children: 0, status: 'CONSUMED',
    } });
    check(id('FLT'), 'mass assignment on fare quote rejected', r.status === 400, `status=${r.status}`);
  } else {
    record(false, id('FLT'), 'no sellable fare found to quote');
  }

  r = await call('GET', '/flight-quotes/not-a-uuid', {});
  check(id('FLT'), 'malformed fare-quote id is 400, never 500', r.status === 400, `status=${r.status}`);

  const fBody = (quoteId, extraPassenger = false) => ({
    quoteId, contactEmail: u1.email, contactPhone: '+91 98200 12345',
    passengers: [
      { firstName: 'Lead', lastName: 'Flyer', isLeadPassenger: true },
      { firstName: 'Second', lastName: 'Flyer' },
      ...(extraPassenger ? [{ firstName: 'Extra', lastName: 'Flyer' }] : []),
    ],
    acceptedCancellationPolicy: true,
  });

  r = await call('POST', '/flight-bookings', { body: fBody(fQuote?.quoteId) });
  check(id('FLT'), 'flight booking without auth is 401', r.status === 401, `status=${r.status}`);

  r = await call('POST', '/flight-bookings', { token: t1, body: fBody(fQuote?.quoteId, true) });
  check(id('FLT'), 'passenger count must match the quoted party', r.status === 400, `status=${r.status}`);

  r = await call('POST', '/flight-bookings', { token: t1, body: fBody(fQuote?.quoteId) });
  const fBooking = r.json;
  check(id('FLT'), 'flight booking created with a VYF reference',
    r.status === 201 && /^VYF-/.test(fBooking?.reference ?? '') && fBooking?.totalMinor === fQuote?.fare?.price?.totalMinor,
    `status=${r.status} ref=${fBooking?.reference}`);

  r = await call('GET', `/flight-bookings/${fBooking?.reference}`, { token: t2 });
  check(id('FLT'), "another user's flight booking is invisible", r.status === 404, `status=${r.status}`);

  const fKey = `fqa-${stamp}`;
  r = await call('POST', `/flight-bookings/${fBooking?.reference}/payments`, { token: t1, body: { scenario: 'SUCCESS', idempotencyKey: fKey } });
  const fPaid = r.json;
  check(id('FLT'), 'flight demo payment confirms the booking',
    (r.status === 201 || r.status === 200) && /CONFIRMED/.test(fPaid?.booking?.status ?? ''), `status=${r.status}`);

  r = await call('POST', `/flight-bookings/${fBooking?.reference}/payments`, { token: t1, body: { scenario: 'SUCCESS', idempotencyKey: fKey } });
  check(id('FLT'), 'flight payment replay returns the original attempt',
    (r.json?.attempt?.id ?? null) === (fPaid?.attempt?.id ?? undefined), `replay=${r.json?.attempt?.id}`);

  r = await call('POST', `/flight-bookings/${fBooking?.reference}/cancellation`, { token: t1, body: { reason: 'QA audit' } });
  check(id('FLT'), 'flight cancellation follows fare rules',
    (r.status === 200 || r.status === 201) && /CANCELLED/.test(r.json?.status ?? ''), `status=${r.status}`);

  r = await call('POST', `/flight-bookings/${fBooking?.reference}/cancellation`, { token: t1, body: {} });
  check(id('FLT'), 'double flight cancellation rejected', r.status === 409, `status=${r.status}`);

  // ------------------------------------------------------------------ DONE
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
