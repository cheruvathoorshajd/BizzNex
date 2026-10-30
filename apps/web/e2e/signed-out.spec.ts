import { test, expect } from '@playwright/test';
import { screen, settled } from './helpers';

test.describe('signed out', () => {
  test('the landing page plays the transitions with the app’s own screens', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    const section = page.locator('#transitions');
    await expect(section.getByRole('heading', { name: 'Every move has its moment' })).toBeVisible();
    await section.getByRole('button', { name: /Switch features/ }).click();
    await expect(section.locator('.lpt-stage .txs.txs-aurora.txs-compact.txs-inline')).toBeVisible();
    await section.getByRole('button', { name: /Sign in/ }).first().click();
    await expect(section.locator('.lpt-stage .txs.txs-skyline')).toContainText('Good');
    await expect(section.getByRole('button', { name: 'Play all seven' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('opening the demo plays Skyline, then the wizard with a single scrollbar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Explore the demo/ }).first().click();
    await expect(screen(page).and(page.locator('.txs-skyline'))).toContainText('Opening the demo business');
    await expect(page.locator('.ob')).toBeVisible({ timeout: 15_000 });
    // the page behind the full-screen wizard must not scroll (no second scrollbar)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
    await page.getByRole('button', { name: 'Skip setup' }).click();
    await settled(page);
    await expect(page.locator('.sidebar')).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
  });
});
