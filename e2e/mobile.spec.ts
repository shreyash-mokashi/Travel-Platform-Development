import { expect, test } from '@playwright/test';
import {
  completeGuestDetails,
  newUser,
  openSearchWithResults,
  registerThroughUi,
  runDemoPayment,
} from './helpers';

/** The primary booking flow has to work on a phone, not just on a desktop. */
test.describe('Mobile booking flow', () => {
  test('completes a booking on a phone viewport', async ({ page }) => {
    const user = newUser('mobile');
    await registerThroughUi(page, user);

    await openSearchWithResults(page);
    await expect(page.getByTestId('toggle-filters')).toBeVisible();

    await page.getByTestId('hotel-card').first().getByTestId('view-hotel').click();
    await page.waitForURL(/\/hotels\/[^/]+\?/);

    await page.getByTestId('room-offer').first().getByTestId('select-room').click();
    await page.waitForURL(/\/checkout\//);

    const reference = await completeGuestDetails(page);
    await runDemoPayment(page, 'SUCCESS');
    await page.waitForURL(/\/bookings\/VYG-/);

    await expect(page.getByTestId('booking-reference')).toHaveText(reference);
  });

  test('the page never scrolls sideways', async ({ page }) => {
    await openSearchWithResults(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('the mobile menu opens and navigates', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();

    const nav = page.locator('#mobile-nav');
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'Destinations' }).click();

    await page.waitForURL('/destinations');
    await expect(page.getByRole('heading', { name: 'Destinations' })).toBeVisible();
  });

  test('mobile filters apply to the results', async ({ page }) => {
    await openSearchWithResults(page);
    await page.getByTestId('toggle-filters').click();

    // The desktop sidebar is still in the DOM (hidden), so scope to the drawer.
    const drawer = page.getByTestId('filters-mobile');
    await expect(drawer.getByTestId('filter-free-cancellation')).toBeVisible();
    await drawer.getByTestId('filter-free-cancellation').check();
    await page.waitForURL(/freeCancellation=true/);

    await expect(page.getByTestId('result-count')).toBeVisible();
  });
});
