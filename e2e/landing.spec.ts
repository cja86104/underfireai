import { test, expect } from '@playwright/test';

/**
 * Critical browser-flow smoke test for the public landing page.
 *
 * Why this is the first e2e test:
 *   The landing page boots the entire Next.js + React + RSC stack with
 *   no authentication, no database calls, and no third-party API
 *   dependencies. A failure here means the production build is broken
 *   in a way that no unit test would catch — bad SSR, hydration errors,
 *   missing CSS, broken module resolution, runtime exceptions on first
 *   paint. It is the cheapest end-to-end signal that the site can be
 *   served at all.
 *
 * Assertions are anchored to literal copy and routes that exist in the
 * current code (`app/page.tsx`, `app/(auth)/login`, `app/(auth)/register`),
 * not to text we hope is there. Update the assertions if the copy or
 * routing changes; failing this test should always indicate a real
 * regression, never an outdated expectation.
 */
test.describe('Landing page', () => {
  test('renders the hero, brand mark, and primary auth CTAs', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');

    // Document title is set by app/layout.tsx Metadata.title.default.
    await expect(page).toHaveTitle(/UnderFireAI/);

    // Hero H1 lives in app/page.tsx around the "Master Your Interviews" span.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Master Your Interviews'
    );

    // Brand wordmark in the nav.
    await expect(page.locator('nav, header').first()).toContainText(
      'UnderFireAI'
    );

    // Auth CTAs are real <Link> elements pointing at the (auth) routes.
    const signInLink = page.getByRole('link', { name: /sign in/i }).first();
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute('href', '/login');

    // Page must boot without throwing — uncaught errors or console.error
    // calls during load are treated as test failures so silent runtime
    // regressions cannot ship green.
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('Sign in link navigates to the login route', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign in/i }).first().click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
