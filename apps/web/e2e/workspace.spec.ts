import { test, expect } from '@playwright/test';
import { DEMO_STATE, demoData, dismissGuide, navItem, screen, settled } from './helpers';

test.use({ storageState: DEMO_STATE });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.sidebar')).toBeVisible();
  await settled(page);
  await dismissGuide(page);
});

const crumb = (page: import('@playwright/test').Page) => page.locator('.crumb b');

test('switching features plays the Aurora over the main column only', async ({ page }) => {
  await navItem(page, 'Deals').click();
  const aurora = screen(page).and(page.locator('.txs-aurora.txs-compact.txs-inline'));
  await expect(aurora).toBeVisible();
  const left = await aurora.evaluate((el) => el.getBoundingClientRect().left);
  const side = await page.locator('.sidebar').evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.round(left)).toBe(Math.round(side));          // the sidebar stays uncovered
  await settled(page);
  await expect(crumb(page)).toHaveText('Deals');
});

test('the sidebar folds, pops out on hover without moving the page, and is remembered', async ({ page }) => {
  const sidebar = page.locator('.sidebar');
  await page.locator('.side-toggle').click();
  await page.mouse.move(900, 400);
  await expect.poll(() => sidebar.evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(64);
  await sidebar.hover({ position: { x: 30, y: 300 } });
  await expect(sidebar).toHaveClass(/peek/);
  await expect.poll(() => sidebar.evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(248);
  expect(await page.locator('.main-area').evaluate((el) => Math.round(el.getBoundingClientRect().left))).toBe(64);
  await page.mouse.move(900, 400);
  await expect(sidebar).not.toHaveClass(/peek/);
  await page.reload();
  await expect(sidebar).toHaveClass(/collapsed/);
  // the avatar sits on the icon column, and sign-out stays on screen
  const iconX = await page.locator('.sidebar .nav svg').first().evaluate((el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; });
  const avatarX = await page.locator('.sidebar .av').evaluate((el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; });
  expect(Math.abs(iconX - avatarX)).toBeLessThan(1);
  await page.mouse.move(900, 400);
  await page.keyboard.press('[');
  await expect(sidebar).not.toHaveClass(/collapsed/);
});

test('the dashboard search finds tools, projects and events, and opens them', async ({ page }) => {
  await expect(crumb(page)).toHaveText('Dashboard');
  await page.locator('body').click({ position: { x: 900, y: 600 } });
  await page.keyboard.press('/');
  const box = page.getByRole('combobox', { name: 'Search BizzNex' });
  await expect(box).toBeFocused();

  await box.fill('calc');
  await expect(page.getByRole('option', { name: /Calculator/ })).toBeVisible();
  await box.press('Enter');
  await settled(page);
  await expect(crumb(page)).toHaveText('Calculator');

  const data = await demoData(page);
  for (const [name, page_] of [[data.project, 'Projects'], [data.event, 'Events']] as const) {
    if (!name) continue;
    await navItem(page, 'Dashboard').click();
    await settled(page);
    await box.fill(name.split(' ').slice(-1)[0]);
    await page.getByRole('option', { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click();
    await settled(page);
    await expect(crumb(page)).toHaveText(page_);
    await expect(page.locator('.top-search-inp')).toHaveValue(name);   // opened already filtered
    await expect(page.locator('.view')).toContainText(name);
  }

  await navItem(page, 'Dashboard').click();
  await settled(page);
  await box.fill('zzqqxx');
  await expect(page.locator('.gsearch-empty')).toBeVisible();
  await box.press('Escape');
  await expect(box).toHaveValue('');
});

test('form labels name their fields', async ({ page }) => {
  await navItem(page, 'Companies').click();
  await settled(page);
  await dismissGuide(page);
  await expect(page.getByLabel('Industry').first()).toBeEditable();
  await expect(page.getByLabel('Website').first()).toBeEditable();
});

test('signing out says goodbye, then shows sign-in', async ({ page }) => {
  await page.locator('.side-out').click();
  await expect(screen(page).and(page.locator('.txs-aurora'))).toContainText('See you soon');
  await settled(page);
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test('a session the API rejects says why', async ({ page }) => {
  await page.evaluate(() => {
    const auth = JSON.parse(localStorage.getItem('bizznex-auth') || '{}');
    auth.token = 'not-a-valid-token';
    localStorage.setItem('bizznex-auth', JSON.stringify(auth));
  });
  await page.reload();
  await expect(screen(page).and(page.locator('.txs-aurora'))).toContainText('You were signed out.');
  await settled(page);
  await expect(page.locator('.auth2-ended')).toBeVisible();
});
