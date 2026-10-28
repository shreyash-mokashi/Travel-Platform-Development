import { expect, type Page, type APIRequestContext } from '@playwright/test';
import { addDays } from '@voyago/shared';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1';

/** Today in UTC, matching how the API treats calendar dates. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Stay windows are spread out because each quote softly holds inventory for
 * twenty minutes. Reusing one window across specs would exhaust the room.
 */
let windowCursor = 0;
export function nextStay(nights = 2): { checkIn: string; checkOut: string } {
  windowCursor += 3;
  const checkIn = addDays(today(), 60 + windowCursor);
  return { checkIn, checkOut: addDays(checkIn, nights) };
}

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export function newUser(prefix: string): TestUser {
  return {
    email: `e2e.${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@voyago.test`,
    password: 'E2ePassw0rd!2026',
    firstName: 'Playwright',
    lastName: 'Tester',
  };
}

/** Registers through the UI so the session cookie is set the real way. */
export async function registerThroughUi(page: Page, user: TestUser, returnTo = '/bookings') {
  await page.goto(`/register?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByTestId('register-first-name').fill(user.firstName);
  await page.getByTestId('register-last-name').fill(user.lastName);
  await page.getByTestId('register-email').fill(user.email);
  await page.getByTestId('register-password').fill(user.password);
  await page.getByTestId('register-confirm-password').fill(user.password);
  await page.getByTestId('register-submit').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register'), { timeout: 30_000 });
}

export async function loginThroughUi(page: Page, user: TestUser, returnTo = '/bookings') {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByTestId('login-email').fill(user.email);
  await page.getByTestId('login-password').fill(user.password);
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
}

/**
 * Waits for the result list to settle after a filter, sort or page change.
 * Filter changes are client-side transitions, so the URL updates before the
 * server has sent new results; asserting on counts before this returns would
 * measure the in-flight state.
 */
export async function waitForResults(page: Page) {
  await expect(page.getByTestId('hotel-card-skeleton')).toHaveCount(0);
  await expect(page.getByTestId('result-count')).toBeVisible();
  // The filter panel drops its busy flag once the new results are rendered.
  await expect(page.getByTestId('search-filters').first()).toHaveAttribute('aria-busy', 'false');
}

export function searchUrl(stay: { checkIn: string; checkOut: string }, destination = 'goa') {
  const params = new URLSearchParams({
    destination,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    rooms: '1',
    adults: '2',
    children: '0',
  });
  return `/hotels?${params.toString()}`;
}

/**
 * Opens a search that actually has results. Some seeded nights are sold out,
 * and earlier tests hold inventory through their quotes, so this walks forward
 * until a window has at least `minResults` properties on sale.
 */
export async function openSearchWithResults(page: Page, destination = 'goa', minResults = 1) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const stay = nextStay();
    await page.goto(searchUrl(stay, destination));
    await expect(page.getByTestId('search-summary')).toBeVisible();
    if ((await page.getByTestId('hotel-card').count()) >= minResults) return stay;
  }
  throw new Error(`No window with at least ${minResults} available properties in ${destination}`);
}

/** Drives search → hotel → room selection → checkout page. */
export async function selectFirstRoom(page: Page, destination = 'goa') {
  const stay = await openSearchWithResults(page, destination);

  await page.getByTestId('hotel-card').first().getByTestId('view-hotel').click();
  await page.waitForURL(/\/hotels\/[^/]+\?/, { timeout: 30_000 });

  const offers = page.getByTestId('room-offer');
  await expect(offers.first()).toBeVisible();
  await offers.first().getByTestId('select-room').click();

  await page.waitForURL(/\/checkout\//, { timeout: 30_000 });
  return stay;
}

/**
 * Drives search → hotel → a room whose rate plan carries the given badge
 * ("Refundable" or "Non-refundable"), then on to checkout. Walks forward
 * through stay windows until such a rate is actually on sale.
 */
export async function selectRoomByPolicy(
  page: Page,
  badge: 'Refundable' | 'Non-refundable',
  destination = 'goa',
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const stay = nextStay();
    await page.goto(searchUrl(stay, destination));
    await expect(page.getByTestId('search-summary')).toBeVisible();

    if ((await page.getByTestId('hotel-card').count()) === 0) continue;

    await page.getByTestId('hotel-card').first().getByTestId('view-hotel').click();
    await page.waitForURL(/\/hotels\/[^/]+\?/, { timeout: 30_000 });
    await expect(page.getByTestId('room-offers')).toBeVisible();

    // "Non-refundable" also contains "refundable", so match the exact badge.
    const match = page
      .getByTestId('room-offer')
      .filter({ has: page.getByText(badge, { exact: true }) })
      .first();

    if ((await match.count()) === 0) continue;

    await match.getByTestId('select-room').click();
    await page.waitForURL(/\/checkout\//, { timeout: 30_000 });
    return stay;
  }
  throw new Error(`No ${badge} rate found in any window`);
}

/** Fills guest details and creates the booking, landing on the payment page. */
export async function completeGuestDetails(page: Page) {
  await expect(page.getByTestId('checkout-form')).toBeVisible();
  await page.getByTestId('guest-first-name-0').fill('Playwright');
  await page.getByTestId('guest-last-name-0').fill('Tester');
  await page.getByTestId('contact-phone').fill('+91 98200 12345');
  await page.getByTestId('accept-policy').check();
  await page.getByTestId('continue-to-payment').click();

  await page.waitForURL(/\/checkout\/payment\//, { timeout: 30_000 });
  const reference = await page.getByTestId('booking-reference').innerText();
  return reference.trim();
}

export async function runDemoPayment(page: Page, scenario: 'SUCCESS' | 'FAILURE' | 'PENDING') {
  await expect(page.getByTestId('payment-simulator')).toBeVisible();
  await page.getByTestId(`scenario-${scenario}`).check();
  await page.getByTestId('submit-payment').click();
}

/** Signs in directly against the API, for setting up a second user quickly. */
export async function apiLogin(request: APIRequestContext, user: TestUser) {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).accessToken as string;
}
