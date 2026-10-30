// Retakes the README screenshots in docs/screenshots (WebP, 1440×900 at 2×; phone 390×844 at 3×).
// Run with the app running locally (web :3005, API :3001) and the demo freshly reset:
//   npm run seed -w @bizznex/api && npm run screenshots
// Uses Playwright with the installed Google Chrome.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3005';
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'chrome' });
const shot = async (page, name) => { await sleep(700); await page.screenshot({ path: `${OUT}/${name}.webp`, type: 'webp', quality: 82 }); console.log('  ', name); };
const settled = (page) => page.waitForFunction(() => !document.querySelector('.txs:not(.txs-panel)'), undefined, { timeout: 15000 });
const gotIt = async (page) => { const b = page.getByRole('button', { name: 'Got it' }); if (await b.isVisible().catch(() => false)) await b.click(); };
const go = async (page, name) => {
  await page.locator('.sidebar .nav', { has: page.locator('.nav-label', { hasText: new RegExp(`^${name}$`) }) }).click();
  await settled(page); await gotIt(page); await page.mouse.move(1300, 880);
};
const context = (opts = {}) => browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light', ...opts });

// signed out: landing and sign-up
{
  const ctx = await context(); const page = await ctx.newPage();
  await page.goto(BASE); await shot(page, 'landing');
  await page.goto(`${BASE}/?start=signup`); await shot(page, 'signup');
  await ctx.close();
}

// the demo: wizard, then the workspace
const ctx = await context(); const page = await ctx.newPage();
await page.goto(BASE);
await page.getByRole('button', { name: /Explore the demo/ }).first().click();
await page.locator('.ob').waitFor({ timeout: 20000 }); await settled(page);
await shot(page, 'onboarding-wizard');
await page.getByRole('button', { name: 'Skip setup' }).click(); await settled(page); await gotIt(page);
await page.mouse.move(1300, 880);
await shot(page, 'dashboard');
await page.locator('.globe-hero').scrollIntoViewIfNeeded(); await sleep(1500); await shot(page, 'globe');
await page.evaluate(() => window.scrollTo(0, 0));

// Studio: two tools beside the dashboard
await page.locator('.sidebar .nav', { hasText: 'Calculator' }).click({ button: 'right' });
await page.locator('.sidebar .nav', { hasText: 'Notes' }).click({ button: 'right' });
// windows open beside the sidebar that launched them; drag them out over the dashboard
const drag = async (title, x, y) => {
  const bar = page.locator('.win-bar', { hasText: title }); const b = await bar.boundingBox();
  await page.mouse.move(b.x + 60, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(x, y, { steps: 12 }); await page.mouse.up(); await sleep(300);
};
await drag('Calculator', 820, 130);
await drag('Notes', 1110, 170);
await page.mouse.move(700, 880); await sleep(800); await shot(page, 'studio-windows');
// close the windows (one at a time: each close re-renders the layer) and wait until none are left
while (await page.locator('.win-btns [aria-label="Close"]').count()) {
  await page.locator('.win-btns [aria-label="Close"]').first().click();
  await sleep(500);
}

await go(page, 'Projects'); await shot(page, 'projects');
await go(page, 'Contacts'); await shot(page, 'contacts');
await page.locator('.view [aria-label^="Delete"]').first().click();
await page.locator('.modal').waitFor(); await shot(page, 'confirm-delete');
await page.getByRole('button', { name: 'Cancel' }).click(); await sleep(400);
await go(page, 'Deals'); await shot(page, 'deals');
await go(page, 'Assistant');
await page.getByPlaceholder(/Ask Brenda/).fill('What is my pipeline worth?'); await page.keyboard.press('Enter');
await sleep(1200); await shot(page, 'assistant');
await page.locator('.user-link').click(); await settled(page); await gotIt(page); await shot(page, 'settings');

// the tour, from the Help menu
await go(page, 'Dashboard'); await page.evaluate(() => window.scrollTo(0, 0));
await page.getByRole('button', { name: 'Help' }).click();
await page.getByRole('menuitem', { name: /Product tour/ }).click();
await page.locator('.tour-card').waitFor(); await sleep(600); await shot(page, 'onboarding-tour');
await page.keyboard.press('Escape'); await sleep(400);

// dark: the same session with the OS asking for dark
await page.emulateMedia({ colorScheme: 'dark' }); await sleep(600);
await go(page, 'Dashboard'); await page.evaluate(() => window.scrollTo(0, 0)); await shot(page, 'dashboard-dark');
await go(page, 'Deals'); await shot(page, 'deals-dark');
await ctx.close();

// phone
{
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: 'light', isMobile: true, hasTouch: true, storageState: undefined });
  const p = await phone.newPage();
  await p.goto(BASE);
  await p.getByRole('button', { name: /Explore the demo/ }).first().click();
  await p.locator('.ob').waitFor({ timeout: 20000 }); await settled(p);
  await p.getByRole('button', { name: 'Skip setup' }).click(); await settled(p); await gotIt(p);
  await shot(p, 'mobile-dashboard');
  await phone.close();
}
await browser.close();
