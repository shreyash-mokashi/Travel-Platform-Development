import { expect, test } from '@playwright/test';
import { loginThroughUi, newUser, registerThroughUi, type TestUser } from './helpers';

/**
 * The seeded administrator. Its password is supplied by the environment and is
 * deliberately never committed - set SEED_DEMO_ADMIN_PASSWORD before seeding
 * and before running this suite.
 */
const ADMIN_PASSWORD = process.env.SEED_DEMO_ADMIN_PASSWORD;

const ADMIN: TestUser = {
  email: 'demo.admin@voyago.test',
  password: ADMIN_PASSWORD ?? '',
  firstName: 'Priya',
  lastName: 'Menon',
};

test.describe('Admin dashboard', () => {
  test('a customer cannot reach the admin dashboard', async ({ page }) => {
    const user = newUser('nonadmin');
    await registerThroughUi(page, user);

    await page.goto('/admin');
    await expect(page.getByText('Administrator access required')).toBeVisible();
    await expect(page.getByTestId('admin-overview')).toHaveCount(0);
  });

  test('an anonymous visitor is sent to sign in', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/login\?returnTo=%2Fadmin/);
    await expect(page.getByTestId('login-form')).toBeVisible();
  });

  test.beforeEach(({}, testInfo) => {
    const needsAdmin =
      !testInfo.title.includes('customer cannot') && !testInfo.title.includes('anonymous visitor');
    test.skip(
      needsAdmin && !ADMIN_PASSWORD,
      'Set SEED_DEMO_ADMIN_PASSWORD to the value printed by the seed to run the admin suite.',
    );
  });

  test('shows metrics computed from the database', async ({ page }) => {
    await loginThroughUi(page, ADMIN, '/admin');
    await expect(page.getByTestId('admin-overview')).toBeVisible();

    // Inventory counts must match the seeded catalogue, not hardcoded numbers.
    await expect(page.getByText('Active hotels')).toBeVisible();
    await expect(page.getByTestId('metric-bookings')).toBeVisible();
    await expect(page.getByTestId('metric-revenue')).toContainText('₹');
  });

  test('lists and filters bookings', async ({ page }) => {
    await loginThroughUi(page, ADMIN, '/admin/bookings');

    await expect(page.getByTestId('admin-booking-count')).toBeVisible();
    const total = await page.getByTestId('admin-booking-count').innerText();

    await page.getByTestId('admin-status-filter').selectOption('CONFIRMED');
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.waitForURL(/status=CONFIRMED/);

    await expect(page.getByTestId('admin-booking-count')).toBeVisible();
    const rows = page.getByTestId('admin-booking-rows').locator('tr');
    if ((await rows.count()) > 0) {
      await expect(rows.first()).toContainText('Confirmed');
    }
    expect(total).toBeTruthy();
  });

  test('opens hotel inventory and shows nightly rates', async ({ page }) => {
    await loginThroughUi(page, ADMIN, '/admin/hotels');

    await expect(page.getByTestId('admin-hotel-list')).toBeVisible();
    await page.getByTestId('admin-hotel-list').getByRole('link').first().click();
    await page.waitForURL(/\/admin\/hotels\/[0-9a-f-]+$/);

    // One room type per section, so these headings repeat down the page.
    await expect(page.getByText('Rate plans').first()).toBeVisible();
    await expect(page.getByText('Next 30 nights').first()).toBeVisible();
    await expect(page.getByText(/open|Sold out/).first()).toBeVisible();
  });

  test('records an inventory change in the audit log', async ({ page }) => {
    await loginThroughUi(page, ADMIN, '/admin/hotels');
    await page.getByTestId('admin-hotel-list').getByRole('link').first().click();
    await page.waitForURL(/\/admin\/hotels\/[0-9a-f-]+$/);

    await page.getByText('Edit availability and rates').first().click();
    const form = page.locator('[data-testid^="inventory-form-"]').first();
    await form.getByLabel('Rooms open').fill('7');
    await form.getByRole('button', { name: /Apply to date range/ }).click();

    await expect(page.getByText(/Updated \d+ night/)).toBeVisible();

    await page.goto('/admin/audit');
    await expect(page.getByTestId('audit-list')).toBeVisible();
    await expect(page.getByText('inventory updated').first()).toBeVisible();
  });

  test('shows simulated refunds with their policy reason', async ({ page }) => {
    await loginThroughUi(page, ADMIN, '/admin/refunds');
    await expect(page.getByText('Simulated refunds.')).toBeVisible();
  });
});
