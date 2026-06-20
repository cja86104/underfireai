import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for UnderFireAI end-to-end tests.
 *
 * - testDir is `e2e/` so unit tests (in `tests/`) are not picked up.
 * - The webServer block boots the Next.js dev server before tests run.
 *   We use `dev` instead of `build && start` so the test feedback loop
 *   stays under a minute on local machines; for production-mode e2e in
 *   CI, override the command via the PLAYWRIGHT_WEB_COMMAND env var or
 *   change this file.
 * - reuseExistingServer lets engineers iterate locally without
 *   restarting the server between test runs.
 * - baseURL is configurable via PLAYWRIGHT_BASE_URL so the same suite
 *   can run against staging or production.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: process.env.PLAYWRIGHT_WEB_COMMAND ?? 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
