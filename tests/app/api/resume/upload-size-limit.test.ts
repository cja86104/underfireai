// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests for the Content-Length pre-check added to
 * app/api/resume/upload/route.ts (audit finding, underfireai-audit-checklist-v1.md
 * Section 6 Upload path: "Verify Next.js body size limit
 * (`experimental.serverActions.bodySizeLimit = 10mb` in next.config.ts)
 * doesn't allow a 10 MB file to reach the handler before being rejected.").
 *
 * That config key only applies to Server Actions, not Route Handlers like
 * this one, so without an explicit check, request.formData() would fully
 * buffer an arbitrarily large multipart body into memory before the
 * in-handler `file.size > 5MB` check ever runs. This test asserts an
 * oversized request (by Content-Length) is rejected with 413 before
 * formData() is read, and that a reasonably-sized request is not blocked
 * by this check.
 */

process.env.NEXT_PUBLIC_APP_URL = 'https://test.underfireai.local';

vi.mock('pdf-parse', () => ({ default: vi.fn() }));
vi.mock('mammoth', () => ({ default: { extractRawText: vi.fn() } }));

vi.mock('@/lib/supabase/server', () => ({
  getCurrentUser: async () => ({ id: 'user-1', email: 'test@example.com' }),
  getSubscriptionStatus: async () => ({ hasPurchased: true }),
  createClient: async () => ({}),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: async () => ({ allowed: true }),
  rateLimitHeaders: () => ({}),
}));

const mockCreateChatCompletion = vi.fn();
vi.mock('@/lib/ai/chat-client', () => ({
  createChatCompletion: (...args: unknown[]) => mockCreateChatCompletion(...args),
}));

const mockUploadResume = vi.fn();
vi.mock('@/lib/storage', () => ({
  uploadResume: (...args: unknown[]) => mockUploadResume(...args),
}));

const mockGenerateAndSaveVulnerabilityScan = vi.fn();
vi.mock('@/lib/resume/insights-service', () => ({
  generateAndSaveVulnerabilityScan: (...args: unknown[]) => mockGenerateAndSaveVulnerabilityScan(...args),
}));

const { POST } = await import('@/app/api/resume/upload/route');

function makeOversizedRequest(fakeContentLengthBytes: number): NextRequest {
  // Deliberately does NOT send a real body of this size — the check under
  // test reads only the Content-Length header, before any body bytes are
  // read, so faking the header is the correct way to exercise it without
  // actually transferring megabytes of data in a unit test.
  const headers = new Headers();
  headers.set('content-length', String(fakeContentLengthBytes));
  return new NextRequest('https://underfireai.test/api/resume/upload', {
    method: 'POST',
    headers,
    body: 'irrelevant-for-the-size-check',
  });
}

function makeNormalMultipartRequest(): NextRequest {
  // A real, small multipart/form-data body with no `file` field. The
  // runtime computes its own (small) Content-Length automatically, so this
  // naturally falls well under the ceiling without needing to fake anything.
  const formData = new FormData();
  formData.set('target_role', 'Software Engineer');
  return new NextRequest('https://underfireai.test/api/resume/upload', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/resume/upload — Content-Length pre-check', () => {
  beforeEach(() => {
    mockCreateChatCompletion.mockReset();
    mockUploadResume.mockReset();
    mockGenerateAndSaveVulnerabilityScan.mockReset();
  });

  it('rejects an oversized upload with 413 before touching formData()/storage/AI calls', async () => {
    const request = makeOversizedRequest(9 * 1024 * 1024); // 9MB > 8MB ceiling

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(mockUploadResume).not.toHaveBeenCalled();
    expect(mockCreateChatCompletion).not.toHaveBeenCalled();
    expect(mockGenerateAndSaveVulnerabilityScan).not.toHaveBeenCalled();
  });

  it('does not block a normal-sized request — reaches the "no file provided" validation instead', async () => {
    const request = makeNormalMultipartRequest();

    const response = await POST(request);
    const body = await response.json() as { message?: string };

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/no file provided/i);
  });
});
