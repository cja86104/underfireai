// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests for the `trait_overrides` whitelist added to
 * app/api/interview/create/route.ts (audit finding, underfireai-audit-checklist-v1.md
 * Section 8 Input Validation: "trait_overrides keys whitelisted to the 6
 * personality fields").
 *
 * Before this fix, `Object.entries(trait_overrides)` (further down in the
 * route) applied ANY key present in the request body directly onto the
 * computed `personality` object, which is then stored verbatim in the
 * `personality_base` JSONB column — polluting it with fields the rest of
 * the app never expects there. It also had no guard against
 * `trait_overrides: null` or an array, which would throw inside
 * `Object.entries()` and only be caught by the route's generic try/catch as
 * an opaque 500.
 */

process.env.NEXT_PUBLIC_APP_URL = 'https://test.underfireai.local';

let mockInsertError: { message: string } | null = { message: 'insert failed (test)' };

vi.mock('@/lib/supabase/server', () => ({
  getCurrentUser: async () => ({ id: 'user-1' }),
  getSubscriptionStatus: async () => ({
    canStartInterview: true,
    usedInterviews: 0,
    hasPurchased: true,
  }),
  createClient: async () => ({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: mockInsertError }),
        }),
      }),
    }),
  }),
}));

const mockGenerateBackstory = vi.fn(async () => 'a generic backstory');
vi.mock('@/lib/ai/backstory-generator', () => ({
  generateBackstory: () => mockGenerateBackstory(),
}));

const { POST } = await import('@/app/api/interview/create/route');

function makeRequest(traitOverrides: unknown): NextRequest {
  return new NextRequest('https://underfireai.test/api/interview/create', {
    method: 'POST',
    body: JSON.stringify({
      interview_type: 'behavioral',
      company_style: 'startup',
      target_role: 'Software Engineer',
      target_company: null,
      difficulty: 5,
      use_voice_mode: false,
      interviewer_id: null,
      generate_new_interviewer: true,
      session_length: 'standard',
      archetype_mix: [],
      constraints: [],
      trait_overrides: traitOverrides,
    }),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/interview/create — trait_overrides whitelist', () => {
  beforeEach(() => {
    mockGenerateBackstory.mockClear();
    mockInsertError = { message: 'insert failed (test)' };
  });

  it('rejects an unknown trait_overrides key with 400 before touching the DB or AI calls', async () => {
    const request = makeRequest({ directness: 50, not_a_real_field: 99 });

    const response = await POST(request);
    const body = await response.json() as { message?: string };

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/unknown trait_overrides key/i);
    expect(mockGenerateBackstory).not.toHaveBeenCalled();
  });

  it('rejects trait_overrides: null with 400 instead of crashing', async () => {
    const request = makeRequest(null);

    const response = await POST(request);
    const body = await response.json() as { message?: string };

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/trait_overrides must be an object/i);
  });

  it('rejects trait_overrides as an array with 400', async () => {
    const request = makeRequest(['directness']);

    const response = await POST(request);
    const body = await response.json() as { message?: string };

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/trait_overrides must be an object/i);
  });

  it('accepts trait_overrides containing only whitelisted keys and proceeds past validation', async () => {
    const request = makeRequest({ directness: 80, warmth: 20 });

    const response = await POST(request);
    const body = await response.json() as { message?: string };

    // Fails later at the (mocked) interviewer insert — proves the request
    // got past trait_overrides validation into actual interviewer
    // generation, not blocked by the new check.
    expect(body.message).not.toMatch(/trait_overrides/i);
    expect(mockGenerateBackstory).toHaveBeenCalled();
  });
});
