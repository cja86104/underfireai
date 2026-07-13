// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests for the fail-closed fix in lib/supabase/middleware.ts (audit finding,
 * underfireai-audit-checklist-v1.md Section 5 Middleware matcher: "does it
 * fail-closed on Supabase errors? If Supabase is unreachable, does the app
 * log out the user or continue with stale cookies?").
 *
 * Before this fix, `await supabase.auth.getUser()` was unwrapped — if
 * Supabase itself were unreachable (network blip, regional outage), the
 * rejection would propagate as an unhandled middleware error on every
 * single request site-wide (the matcher covers almost every route,
 * including public marketing pages that need no auth at all). The fix
 * wraps the call in try/catch and treats a failure as "no user", which
 * correctly bounces protected routes to /login while public routes keep
 * rendering.
 */

let getUserImpl: () => Promise<{ data: { user: null } }>;

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => getUserImpl(),
    },
  }),
}));

const { updateSession } = await import('@/lib/supabase/middleware');

describe('updateSession — fails closed when Supabase is unreachable', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    getUserImpl = () => Promise.reject(new Error('network error'));
  });

  it('redirects a protected route to /login instead of throwing', async () => {
    const request = new NextRequest('https://underfireai.test/dashboard');

    const response = await updateSession(request);

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get('location')).toContain('/login');
  });

  it('does not redirect a public route — the request still renders instead of 500ing', async () => {
    const request = new NextRequest('https://underfireai.test/');

    const response = await updateSession(request);

    expect(response.headers.get('location')).toBeNull();
  });

  it('still redirects protected routes normally when auth.getUser() succeeds with no user', async () => {
    getUserImpl = () => Promise.resolve({ data: { user: null } });
    const request = new NextRequest('https://underfireai.test/dashboard');

    const response = await updateSession(request);

    expect(response.headers.get('location')).toContain('/login');
  });
});
