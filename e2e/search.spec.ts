import { expect, test } from '@playwright/test';
import { nextStay, openSearchWithResults, searchUrl, waitForResults } from './helpers';

test.describe('Hotel search and browsing', () => {
  test('searches from the home page and shows results', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /stays and flights/i })).toBeVisible();
    // The hero is tabbed since flights shipped; hotels is the default panel.
    await expect(page.getByTestId('search-tab-hotels')).toHaveAttribute('aria-selected', 'true');

    const stay = nextStay();
    await page.getByTestId('destination-input').fill('Goa');
    await page.getByTestId('destination-option-goa').click();
    await page.getByTestId('checkin-input').fill(stay.checkIn);
    await page.getByTestId('checkout-input').fill(stay.checkOut);
    await page.getByTestId('search-submit').click();

    await page.waitForURL(/\/hotels\?/);
    await expect(page.getByTestId('search-summary')).toContainText('2 nights');
    await expect(page.getByRole('heading', { name: 'Goa hotels' })).toBeVisible();
  });

  test('shows a validation error instead of searching with no destination', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('search-submit').click();

    await expect(page.getByText('Choose where you want to stay.')).toBeVisible();
    await expect(page).not.toHaveURL(/\/hotels/);
  });

  test('refuses a check-out that is not after check-in', async ({ page }) => {
    await page.goto('/');
    const stay = nextStay();

    await page.getByTestId('destination-input').fill('Goa');
    await page.getByTestId('destination-option-goa').click();
    await page.getByTestId('checkin-input').fill(stay.checkIn);
    await page.getByTestId('checkout-input').fill(stay.checkIn);
    await page.getByTestId('search-submit').click();

    await expect(page.getByText('Check-out must be after check-in.')).toBeVisible();
  });

  test('every result carries a price and links to its hotel', async ({ page }) => {
    await openSearchWithResults(page);

    const cards = page.getByTestId('hotel-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      await expect(cards.nth(index)).toContainText('₹');
      await expect(cards.nth(index).getByTestId('view-hotel')).toBeVisible();
    }
  });

  test('sorting by price reorders the real totals', async ({ page }) => {
    await openSearchWithResults(page, 'goa', 2);
    await page.getByTestId('sort-select').selectOption('price_asc');
    await page.waitForURL(/sort=price_asc/);
    await waitForResults(page);

    const numbers = await page
      .getByTestId('hotel-card-price')
      .evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute('data-price-minor'))));

    expect(numbers.length).toBeGreaterThan(1);
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
  });

  test('a star filter narrows the list and survives a reload', async ({ page }) => {
    await openSearchWithResults(page);

    const before = await page.getByTestId('hotel-card').count();
    const fiveStar = page.getByTestId('filter-star-5');
    test.skip((await fiveStar.count()) === 0, 'No five-star inventory in this window');

    await fiveStar.check();
    await page.waitForURL(/starRatings=5/);
    await waitForResults(page);

    const after = await page.getByTestId('hotel-card').count();
    expect(after).toBeLessThanOrEqual(before);

    // The filter is URL-backed, so a reload must preserve it.
    await page.reload();
    await waitForResults(page);
    await expect(page.getByTestId('filter-star-5')).toBeChecked();
    expect(await page.getByTestId('hotel-card').count()).toBe(after);
  });

  test('clearing filters restores the full list', async ({ page }) => {
    await openSearchWithResults(page);
    const before = await page.getByTestId('hotel-card').count();

    await page.getByTestId('filter-free-cancellation').check();
    await page.waitForURL(/freeCancellation=true/);
    await waitForResults(page);

    await page.getByTestId('clear-filters').click();
    await page.waitForURL((url) => !url.search.includes('freeCancellation'));
    await waitForResults(page);

    expect(await page.getByTestId('hotel-card').count()).toBe(before);
  });

  test('back navigation returns to the unfiltered results', async ({ page }) => {
    await openSearchWithResults(page);
    await page.getByTestId('filter-free-cancellation').check();
    await page.waitForURL(/freeCancellation=true/);
    await waitForResults(page);

    await page.goBack();
    await page.waitForURL((url) => !url.search.includes('freeCancellation'));
    await waitForResults(page);
    await expect(page.getByTestId('filter-free-cancellation')).not.toBeChecked();
  });

  test('shows a helpful empty state when filters exclude everything', async ({ page }) => {
    const stay = nextStay();
    await page.goto(`${searchUrl(stay)}&maxPriceMinor=1`);

    await expect(page.getByText('No hotels match these filters')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clear filters' })).toBeVisible();
  });

  test('prompts for a destination when none is given', async ({ page }) => {
    await page.goto('/hotels');
    await expect(page.getByText('Where would you like to stay?')).toBeVisible();
  });

  test('reports an unknown destination without crashing', async ({ page }) => {
    const stay = nextStay();
    await page.goto(searchUrl(stay, 'atlantis'));
    await expect(page.getByText('Search could not be completed')).toBeVisible();
  });

  test('hotel detail lists rooms, policies and the demo notice', async ({ page }) => {
    await openSearchWithResults(page);
    await page.getByTestId('hotel-card').first().getByTestId('view-hotel').click();
    await page.waitForURL(/\/hotels\/[^/]+\?/);

    await expect(page.getByTestId('hotel-gallery')).toBeVisible();
    await expect(page.getByTestId('room-offers')).toBeVisible();
    await expect(page.getByTestId('room-offer').first()).toContainText('₹');
    await expect(page.getByText(/Demo only/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Available rooms' })).toBeVisible();
  });

  test('gallery thumbnails change the main image', async ({ page }) => {
    await openSearchWithResults(page);
    await page.getByTestId('hotel-card').first().getByTestId('view-hotel').click();
    await page.waitForURL(/\/hotels\/[^/]+\?/);

    const gallery = page.getByTestId('hotel-gallery');
    const firstSrc = await gallery.locator('img').first().getAttribute('src');
    await page.getByTestId('gallery-thumb-2').click();
    await expect(gallery.locator('img').first()).not.toHaveAttribute('src', firstSrc ?? '');
  });

  test('shows the not-found page for an unknown hotel', async ({ page }) => {
    const stay = nextStay();
    await page.goto(
      `/hotels/not-a-real-hotel?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&rooms=1&adults=2&children=0`,
    );

    // Next streams dynamic routes, so the HTTP status stays 200 even though
    // notFound() is raised; the rendered page is what the user actually gets.
    // See "Known limitations" in the README.
    await expect(page.getByText('We could not find that page')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to hotel search' })).toBeVisible();
  });
});
