import { defineConfig } from '@playwright/test';

/**
 * Browser smoke tests (npm run test:e2e -w @bizznex/web).
 * Locally they reuse the dev servers (web :3005, API :3001). In CI they start the built API and a
 * preview of the built web app. They drive the installed Google Chrome, so no browser download.
 * One worker: every test shares the demo account, and sign-in is rate limited per IP.
 */
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  fullyParallel: false,
  retries: CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3005',
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'npm run start -w @bizznex/api', cwd: '../..', url: 'http://localhost:3001/health', reuseExistingServer: !CI, timeout: 120_000 },
    { command: 'npm run preview -w @bizznex/web -- --strictPort', cwd: '../..', url: 'http://localhost:3005', reuseExistingServer: !CI, timeout: 120_000 },
  ],
});
