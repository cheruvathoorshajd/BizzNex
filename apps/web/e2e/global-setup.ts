import { chromium } from '@playwright/test';
import type { FullConfig } from '@playwright/test';
import { DEMO_STATE } from './helpers';

/** Sign in to the demo once, skip its setup, and save the session for the signed-in tests. */
export default async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ baseURL, viewport: { width: 1440, height: 900 } });
  await page.goto('/');
  await page.getByRole('button', { name: /Explore the demo/ }).first().click();
  await page.getByRole('button', { name: 'Skip setup' }).click({ timeout: 30_000 });
  await page.locator('.sidebar').waitFor();
  await page.waitForFunction(() => !document.querySelector('.txs'), undefined, { timeout: 15_000 });
  await page.context().storageState({ path: DEMO_STATE });
  await browser.close();
}
