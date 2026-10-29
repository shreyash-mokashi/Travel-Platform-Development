import { expect, test, type Page } from '@playwright/test';
import { newUser, registerThroughUi, today } from './helpers';

/**
 * The flight booking journey through the real UI against seeded data:
 * tabbed search, fare families, server-held quote, passenger details, demo
 * payment, e-ticket and fare-rule cancellation. Bookings use far-future,
 * per-test dates so seat holds never collide between runs.
 */

let dateCursor = 60;
function nextTravelDate(): string {
  dateCursor += 3;
  const base = new Date(`${today()}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dateCursor);
  return base.toISOString().slice(0, 10);
}

const ROUTES = [
  { from: 'DEL', to: 'BLR' },
  { from: 'BOM', to: 'DEL' },
  { from: 'BOM', to: 'GOI' },
] as const;

/** Searches routes/dates until a page shows at least one sellable offer. */
async function openFlightResults(page: Page): Promise<void> {
  for (let hop = 0; hop < 6; hop += 1) {
    const date = nextTravelDate();
    for (const route of ROUTES) {
      await page.goto(
        `/flights?from=${route.from}&to=${route.to}&date=${date}&adults=1&children=0`,
      );
      if ((await page.getByTestId('flight-offer').count()) > 0) return;
    }
  }
  throw new Error('No sellable flight offers found for the e2e run');
}

async function bookFirstFare(page: Page, user: ReturnType<typeof newUser>) {
  await openFlightResults(page);
  await page.getByTestId('toggle-fares').first().click();
  await page.locator('[data-testid^="select-fare-"]').first().click();

  // The caller registered first, so the quote goes straight to checkout.
  await page.waitForURL(/\/flights\/checkout\//);

  await page.getByTestId('passenger-first-0').fill(user.firstName);
  await page.getByTestId('passenger-last-0').fill(user.lastName);
  await page.locator('input[name="contactPhone"]').fill('+91 98200 12345');
  await page.getByTestId('accept-fare-rules').check();
  await page.getByTestId('continue-to-payment').click();
  await page.waitForURL(/\/checkout\/payment\/VYF-/);

  const reference = (await page.getByTestId('booking-reference').innerText()) as `VYF-${string}`;
  expect(reference).toMatch(/^VYF-[2-9A-HJ-NP-Z]{8}$/);
  return reference;
}

async function runDemoPayment(page: Page, scenario: 'SUCCESS' | 'FAILURE' | 'PENDING') {
  await page.getByTestId(`scenario-${scenario}`).check();
  await page.getByTestId('submit-payment').click();
}

test.describe('Flight booking journey', () => {
  test('searches flights from the home tab and shows fare families', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('search-tab-flights').click();
    await expect(page.getByTestId('flight-search-widget')).toBeVisible();

    await openFlightResults(page);
    await expect(page.getByTestId('flight-search-summary')).toBeVisible();

    await page.getByTestId('toggle-fares').first().click();
    const fares = page.locator('[data-testid^="fare-"]');
    await expect(fares.first()).toBeVisible();
    // Every visible fare card names its cancellation rules.
    await expect(fares.first()).toContainText(/cancellation|non-refundable/i);
  });

  test('books a flight end to end and issues an e-ticket', async ({ page }) => {
    const user = newUser('flight');
    await registerThroughUi(page, user, '/');
    const reference = await bookFirstFare(page, user);

    await runDemoPayment(page, 'SUCCESS');
    await page.waitForURL(/\/bookings\/VYF-.*justPaid=1/);
    await expect(page.getByText('Your flight is booked')).toBeVisible();
    await expect(page.getByTestId('booking-timeline')).toContainText('Confirmed');

    await page.getByRole('link', { name: 'View e-ticket' }).click();
    await page.waitForURL(/\/voucher$/);
    await expect(page.getByTestId('voucher')).toBeVisible();
    await expect(page.getByTestId('voucher-reference')).toHaveText(reference);
    await expect(page.getByText('not valid for travel')).toBeVisible();
  });

  test('recovers from a failed payment and resolves a pending one', async ({ page }) => {
    const user = newUser('flightpay');
    await registerThroughUi(page, user, '/');
    await bookFirstFare(page, user);

    await runDemoPayment(page, 'FAILURE');
    await page.waitForURL(/\/bookings\/VYF-/);
    await expect(page.getByText('The demo payment did not go through')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View e-ticket' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Retry payment' }).click();
    await page.waitForURL(/\/checkout\/payment\/VYF-/);
    await runDemoPayment(page, 'PENDING');
    await page.waitForURL(/\/bookings\/VYF-/);
    await expect(page.getByTestId('resolve-pending')).toBeVisible();

    await page.getByTestId('resolve-success').click();
    await expect(page.getByTestId('booking-timeline')).toContainText('Confirmed');
  });

  test('cancels a flight under its fare rules and lists it with hotel bookings', async ({
    page,
  }) => {
    const user = newUser('flightcxl');
    await registerThroughUi(page, user, '/');
    const reference = await bookFirstFare(page, user);

    await runDemoPayment(page, 'SUCCESS');
    await page.waitForURL(/\/bookings\/VYF-/);

    await page.getByTestId('start-cancel').click();
    await page.getByTestId('confirm-cancel').click();
    await page.waitForURL(/cancelled=1/);
    await expect(page.getByText('Your cancellation has been processed')).toBeVisible();
    await expect(page.getByText('Cancelled').first()).toBeVisible();
    await expect(page.getByTestId('refund-amount')).toBeVisible();

    await page.goto('/bookings');
    const row = page.locator(`[data-booking-reference="${reference}"]`);
    await expect(row).toBeVisible();
    await expect(row).toContainText('→');
  });
});
