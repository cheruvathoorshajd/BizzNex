import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Where global-setup saves a signed-in demo session (git-ignored). */
export const DEMO_STATE = 'e2e/.auth/demo.json';

/** The transition screen currently on (not a loading panel, not the landing player). */
export const screen = (page: Page) => page.locator('.txs:not(.txs-panel):not(.txs-contained)');

/** Wait until no transition screen covers the app. */
export async function settled(page: Page) {
  await expect(screen(page)).toHaveCount(0, { timeout: 15_000 });
}

/** Close a first-visit page guide if one is showing (demo sessions get them). */
export async function dismissGuide(page: Page) {
  const gotIt = page.getByRole('button', { name: 'Got it' });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
}

/** A sidebar page link by its visible name. */
export const navItem = (page: Page, name: string) => page.locator('.sidebar .nav', { has: page.locator('.nav-label', { hasText: new RegExp(`^${name}$`) }) });

/** The demo account's data, read with the session token (for search tests). */
export async function demoData(page: Page) {
  return page.evaluate(async () => {
    const token = JSON.parse(localStorage.getItem('bizznex-auth') || '{}').token;
    const headers = { Authorization: `Bearer ${token}` };
    const projects = await (await fetch('http://localhost:3001/projects', { headers })).json();
    const events = await (await fetch('http://localhost:3001/events', { headers })).json();
    return {
      project: projects[0]?.name as string | undefined,
      task: projects.flatMap((p: { tasks: { name: string }[] }) => p.tasks)[0]?.name as string | undefined,
      event: events[0]?.name as string | undefined,
    };
  });
}
