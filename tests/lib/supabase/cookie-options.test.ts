// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests for the explicit `cookieOptions` added to every Supabase client
 * factory (audit checklist §7 finding: "Verify the CookieOptions include
 * Secure: true in production, SameSite: 'Lax' minimum"). @supabase/ssr's
 * own DEFAULT_COOKIE_OPTIONS ships with no `secure` key at all
 * (node_modules/@supabase/ssr/.../utils/constants.js), so without an
 * explicit override the auth session cookie could legally be sent over
 * plain HTTP. Asserts all three call sites (Server Components/Route
 * Handlers, middleware, and the browser client) pass matching
 * cookieOptions — a mismatch would mean the browser client silently
 * overwrites the server's hardened cookie on the next client-driven auth
 * event (sign-in, sign-up, sign-out, token refresh), since @supabase/ssr
 * merges `{ ...DEFAULT_COOKIE_OPTIONS, ...cookieOptions }` independently on
 * every cookie write.
 */

interface CapturedOptions {
  cookieOptions?: { secure: boolean; sameSite: string };
}

let capturedServerOptions: CapturedOptions | undefined;
let capturedBrowserOptions: CapturedOptions | undefined;

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: CapturedOptions) => {
    capturedServerOptions = options;
    return {
      auth: { getUser: async () => ({ data: { user: null } }) },
    };
  },
  createBrowserClient: (_url: string, _key: string, options: CapturedOptions) => {
    capturedBrowserOptions = options;
    return {};
  },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
  }),
}));

const expectedCookieOptions = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

describe('Supabase cookieOptions — audit checklist §7', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    capturedServerOptions = undefined;
    capturedBrowserOptions = undefined;
  });

  it('lib/supabase/server.ts createClient() passes explicit secure/sameSite cookieOptions', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    await createClient();

    expect(capturedServerOptions?.cookieOptions).toEqual(expectedCookieOptions);
  });

  it('lib/supabase/middleware.ts updateSession() passes the same cookieOptions', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware');
    const request = new NextRequest('https://underfireai.test/');
    await updateSession(request);

    expect(capturedServerOptions?.cookieOptions).toEqual(expectedCookieOptions);
  });

  it('lib/client.ts createClient() (browser) passes cookieOptions matching the server exactly', async () => {
    const { createClient } = await import('@/lib/client');
    createClient();

    expect(capturedBrowserOptions?.cookieOptions).toEqual(expectedCookieOptions);
  });
});
