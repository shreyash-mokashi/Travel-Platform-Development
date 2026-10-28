import { expect, test } from '@playwright/test';
import {
  API_URL,
  apiLogin,
  completeGuestDetails,
  newUser,
  registerThroughUi,
  runDemoPayment,
  selectFirstRoom,
  selectRoomByPolicy,
} from './helpers';

test.describe('Hotel booking journey', () => {
  test('completes a successful demo booking end to end', async ({ page }) => {
    const user = newUser('happy');
    await registerThroughUi(page, user);

    await selectFirstRoom(page);
    await expect(page.getByTestId('price-summary')).toBeVisible();
    await expect(page.getByTestId('quote-countdown')).toBeVisible();
    const quotedTotal = await page.getByTestId('summary-total').innerText();

    const reference = await completeGuestDetails(page);
    expect(reference).toMatch(/^VYG-/);

    // The price the API quoted must be the price being charged.
    await expect(page.getByTestId('payment-amount')).toHaveText(quotedTotal);
    await expect(
      page.getByTestId('payment-simulator').getByText('Demo Payment — No real money is charged.'),
    ).toBeVisible();

    await runDemoPayment(page, 'SUCCESS');
    await page.waitForURL(/\/bookings\/VYG-/);

    await expect(page.getByText('Your booking is confirmed')).toBeVisible();
    await expect(page.getByTestId('booking-reference')).toHaveText(reference);
    await expect(page.getByTestId('booking-total')).toHaveText(quotedTotal);
    await expect(page.getByTestId('booking-timeline')).toContainText('Confirmed');
  });

  test('shows the confirmed booking in the customer history', async ({ page }) => {
    const user = newUser('history');
    await registerThroughUi(page, user);

    await selectFirstRoom(page);
    const reference = await completeGuestDetails(page);
    await runDemoPayment(page, 'SUCCESS');
    await page.waitForURL(/\/bookings\/VYG-/);

    await page.goto('/bookings');
    const row = page.locator(`[data-booking-reference="${reference}"]`);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Confirmed');
  });

  test('persists the booking across a browser refresh', async ({ page }) => {
    const user = newUser('refresh');
    await registerThroughUi(page, user);

    await selectFirstRoom(page);
    const reference = await completeGuestDetails(page);
    await runDemoPayment(page, 'SUCCESS');
    await page.waitForURL(/\/bookings\/VYG-/);

    const total = await page.getByTestId('booking-total').innerText();

    await page.reload();
    await expect(page.getByTestId('booking-reference')).toHaveText(reference);
    await expect(page.getByTestId('booking-total')).toHaveText(total);

    // A fresh navigation reads it back from the database, not from the page.
    await page.goto(`/bookings/${reference}`);
    await expect(page.getByTestId('booking-reference')).toHaveText(reference);
  });

  test('produces a printable voucher from server state', async ({ page }) => {
    const user = newUser('voucher');
    await registerThroughUi(page, user);

    await selectFirstRoom(page);
    const reference = await completeGuestDetails(page);
    await runDemoPayment(page, 'SUCCESS');
    await page.waitForURL(/\/bookings\/VYG-/);

    await page.getByRole('link', { name: 'View voucher' }).click();
    await page.waitForURL(/\/voucher$/);

    await expect(page.getByTestId('voucher')).toBeVisible();
    await expect(page.getByTestId('voucher-reference')).toHaveText(reference);
    await expect(page.getByText(/not a valid travel document/i)).toBeVisible();
  });

  test('recovers from a failed demo payment with a retry', async ({ page }) => {
    const user = newUser('retry');
    await registerThroughUi(page, user);

    await selectFirstRoom(page);
    const reference = await completeGuestDetails(page);

    await runDemoPayment(page, 'FAILURE');
    await page.waitForURL(/\/bookings\/VYG-/);
    await expect(page.getByText('The demo payment did not go through')).toBeVisible();

    await page.getByRole('link', { name: 'Retry payment' }).click();
    await page.waitForURL(/\/checkout\/payment\//);
    await runDemoPayment(page, 'SUCCESS');

    await page.waitForURL(/\/bookings\/VYG-/);
    await expect(page.getByTestId('booking-reference')).toHaveText(reference);
    await expect(page.getByTestId('booking-timeline')).toContainText('Confirmed');
    await expect(page.getByText('Payment failed', { exact: false }).first()).toBeVisible();
  });

  test('holds a pending payment until it is resolved', async ({ page }) => {
    const user = newUser('pending');
    await registerThroughUi(page, user);

    await selectFirstRoom(page);
    await completeGuestDetails(page);

    await runDemoPayment(page, 'PENDING');
    await page.waitForURL(/\/bookings\/VYG-/);

    await expect(page.getByTestId('resolve-pending')).toBeVisible();
    await expect(page.getByTestId('booking-timeline')).toContainText('Payment processing');

    await page.getByTestId('resolve-success').click();
    await expect(page.getByTestId('booking-timeline')).toContainText('Confirmed');
    await expect(page.getByTestId('resolve-pending')).toHaveCount(0);
  });

  test('cancels a refundable booking and shows the simulated refund', async ({ page }) => {
    const user = newUser('cancel');
    await registerThroughUi(page, user);

    // A refundable rate, so a refund is actually due on cancellation.
    await selectRoomByPolicy(page, 'Refundable');

    await completeGuestDetails(page);
    await runDemoPayment(page, 'SUCCESS');
    await page.waitForURL(/\/bookings\/VYG-/);

    await expect(page.getByTestId('cancel-booking')).toBeVisible();
    const refundPreview = await page.getByTestId('refund-preview').innerText();

    await page.getByTestId('start-cancel').click();
    await page.getByTestId('cancel-reason').fill('Plans changed');
    await page.getByTestId('confirm-cancel').click();

    // On success the page re-renders as a cancelled booking, so the cancel
    // form is replaced rather than showing a confirmation in place.
    await expect(page.getByTestId('cancel-booking')).toHaveCount(0);
    await expect(page.getByTestId('refund-amount')).toHaveText(refundPreview);

    await page.reload();
    await expect(page.getByText('Cancelled').first()).toBeVisible();
    await expect(page.getByTestId('refund-amount')).toHaveText(refundPreview);
  });

  test('refunds nothing when a non-refundable rate is cancelled', async ({ page }) => {
    const user = newUser('nonref');
    await registerThroughUi(page, user);

    await selectRoomByPolicy(page, 'Non-refundable');

    await completeGuestDetails(page);
    await runDemoPayment(page, 'SUCCESS');
    await page.waitForURL(/\/bookings\/VYG-/);

    await expect(page.getByTestId('refund-preview')).toContainText('₹0');
    await page.getByTestId('start-cancel').click();
    await page.getByTestId('confirm-cancel').click();

    await page.reload();
    await expect(page.getByTestId('refund-amount')).toContainText('₹0');
  });

  test('stops one customer reading another customer booking', async ({ page, request }) => {
    const owner = newUser('owner');
    await registerThroughUi(page, owner);
    await selectFirstRoom(page);
    const reference = await completeGuestDetails(page);
    await runDemoPayment(page, 'SUCCESS');
    await page.waitForURL(/\/bookings\/VYG-/);

    // Sign out and in as a different customer in the same browser. Waiting on
    // the header flipping back to "Sign in" is what proves the session is
    // actually gone - the URL is already "/" before the click.
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();

    const intruder = newUser('intruder');
    await registerThroughUi(page, intruder);

    await page.goto(`/bookings/${reference}`);
    await expect(page.getByText('Booking not found')).toBeVisible();
    await expect(page.getByTestId('booking-reference')).toHaveCount(0);

    // The API must refuse it too, not just the UI.
    const token = await apiLogin(request, intruder);
    const direct = await request.get(`${API_URL}/bookings/${reference}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(direct.status()).toBe(404);
  });

  test('requires a signed-in user before checkout', async ({ page }) => {
    await selectFirstRoom(page);
    await page.waitForURL(/\/login\?returnTo=/);
    await expect(page.getByTestId('login-form')).toBeVisible();
  });

  test('refuses to continue without accepting the cancellation policy', async ({ page }) => {
    const user = newUser('policy');
    await registerThroughUi(page, user);
    await selectFirstRoom(page);

    await page.getByTestId('guest-first-name-0').fill('Playwright');
    await page.getByTestId('guest-last-name-0').fill('Tester');
    await page.getByTestId('contact-phone').fill('+91 98200 12345');
    await page.getByTestId('continue-to-payment').click();

    // The native required checkbox blocks submission; we stay on checkout.
    await expect(page).toHaveURL(/\/checkout\//);
    await expect(page.getByTestId('accept-policy')).not.toBeChecked();
  });

  test('rejects an invalid contact phone number', async ({ page }) => {
    const user = newUser('phone');
    await registerThroughUi(page, user);
    await selectFirstRoom(page);

    await page.getByTestId('guest-first-name-0').fill('Playwright');
    await page.getByTestId('guest-last-name-0').fill('Tester');
    await page.getByTestId('contact-phone').fill('abc');
    await page.getByTestId('accept-policy').check();
    await page.getByTestId('continue-to-payment').click();

    await expect(page).toHaveURL(/\/checkout\//);
  });

  test('an expired or unknown quote does not pretend to be bookable', async ({ page }) => {
    const user = newUser('badquote');
    await registerThroughUi(page, user);

    await page.goto('/checkout/00000000-0000-4000-8000-000000000000');
    await expect(page.getByText('This price hold is no longer valid')).toBeVisible();
    await expect(page.getByTestId('checkout-form')).toHaveCount(0);
  });
});
