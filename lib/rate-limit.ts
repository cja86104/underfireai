/**
 * UnderFireAI — Rate Limiting (Upstash Redis, feature-flagged)
 *
 * WHY THIS EXISTS
 *   The app has no per-user abuse ceiling. Paying users can loop the TTS,
 *   Judge0, resume-scan, and AI-analysis endpoints fast enough to burn real
 *   external credit. This helper applies sliding-window rate limits backed
 *   by Upstash Redis — purpose-built for Next.js on Vercel (HTTP API, no
 *   persistent connection, pay-per-request).
 *
 * FEATURE FLAG
 *   The entire subsystem is off unless `RATE_LIMIT_ENABLED=true`.
 *   With the flag unset, `checkRateLimit()` returns `{ allowed: true }`
 *   without any Redis call. This keeps the scaffold live-safe: shipping it
 *   behind a flag costs nothing and introduces no new failure mode.
 *
 * ENVIRONMENT VARIABLES (set in Vercel, then flip the flag)
 *   RATE_LIMIT_ENABLED   "true" to activate. Any other value = disabled.
 *   UPSTASH_REDIS_URL    e.g. https://<region>-<id>.upstash.io
 *   UPSTASH_REDIS_TOKEN  Upstash REST API token (read+write).
 *
 *   Sign-up / project creation:  https://console.upstash.com/
 *   After creating a Redis database, copy the two values from the
 *   "REST API" section of the database page.
 *
 * FAIL-OPEN BEHAVIOUR
 *   If the flag is on but credentials are missing, OR if an Upstash call
 *   throws, the helper logs an error and allows the request through. For
 *   a live launch it's safer to drop the protection than to start 500'ing
 *   paying users because of a misconfigured env var. A missing-config
 *   incident is loud in logs; a broken checkout flow is louder on Twitter.
 *
 * IDENTIFIERS
 *   The `identifier` argument scopes the bucket. For per-user limits pass
 *   `user.id`; for per-session limits (where the attack is loop-one-session)
 *   pass `sessionId`. The prefix in `ratelimit-` below keeps namespaces
 *   separate so an identifier colliding across keys does not share budget.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ── Policy table ────────────────────────────────────────────────────────────
// Policies express the audit's recommended ceilings. A number-of-requests
// per duration window. Tune by editing here — no route change needed.
export const RATE_LIMIT_POLICIES = {
  /** Cartesia TTS — paid user can loop and burn credit. 60/min per user. */
  tts:          { requests: 60, window: '60 s' },

  /** Whisper speech-to-text — mobile mic input records audio and uploads
   *  it here because iOS Safari's webkitSpeechRecognition never opens the
   *  real mic. Pay-per-minute; scoped per session. 40 / 5 min covers normal
   *  back-and-forth answers. */
  stt:          { requests: 40, window: '300 s' },

  /** Judge0 code execution — pay-per-submission. 30/5min per session. */
  codeRun:      { requests: 30, window: '300 s' },

  /** Judge0 final submit — separate bucket, tighter. 20/10min per session. */
  codeSubmit:   { requests: 20, window: '600 s' },

  /** Resume upload — each upload spawns a background vulnerability scan
   *  (Mistral call) for paid users. 5/hour per user. */
  resumeUpload: { requests: 5,  window: '3600 s' },

  /** Interview chat — DeepSeek call per turn (3× for panel). Scoped per
   *  session because the attack is loop-one-session. 20/min per session
   *  is a generous human pace (~3 seconds between turns). */
  chat:         { requests: 20, window: '60 s' },

  /** Coaching note generator — Mistral call per invocation. Scoped per
   *  user: one answer at a time across all concurrent sessions. */
  coaching:     { requests: 10, window: '60 s' },

  /** Per-message analysis — Mistral call. Scoped per user; same rationale
   *  as coaching. */
  analyze:      { requests: 10, window: '60 s' },

  /** Job description parser — DeepSeek call per paste. Paste workflow is
   *  infrequent in normal use; 10/hour per user is plenty and caps a
   *  loop-pasted JD abuse path. */
  jdParse:      { requests: 10, window: '3600 s' },

  /** Webhook test delivery — hits a user-supplied URL. Limits both our
   *  outbound load and the ability to use UnderFire as a DDoS reflector
   *  against an arbitrary target. 5/min per user. */
  webhookTest:  { requests: 5,  window: '60 s' },
} as const;

export type RateLimitKey = keyof typeof RATE_LIMIT_POLICIES;

// ── Lazy singleton Redis client ─────────────────────────────────────────────
// Lazy because we do not want `new Redis(...)` to run at module init — builds
// (`next build`) import this file without env vars, and initializing here
// would throw at build time even when the feature is off.
let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;

  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;
  if (!url || !token) {
    console.error(
      '[rate-limit] RATE_LIMIT_ENABLED=true but UPSTASH_REDIS_URL / ' +
      'UPSTASH_REDIS_TOKEN are not set. Failing open — no rate limits ' +
      'are being applied. Set both env vars in Vercel and redeploy.',
    );
    _redis = null;
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}

// ── Per-policy limiter cache ────────────────────────────────────────────────
// Ratelimit instances are cheap but non-trivial; caching by key avoids
// rebuilding the analytics + script objects on every request.
const _limiters = new Map<RateLimitKey, Ratelimit>();

function getLimiter(key: RateLimitKey): Ratelimit | null {
  const cached = _limiters.get(key);
  if (cached) return cached;

  const redis = getRedis();
  if (!redis) return null;

  const cfg = RATE_LIMIT_POLICIES[key];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(cfg.requests, cfg.window),
    prefix: `ufai:ratelimit:${key}`,
    analytics: false,
  });
  _limiters.set(key, limiter);
  return limiter;
}

// ── Result shape ────────────────────────────────────────────────────────────
export interface RateLimitCheck {
  /** True if the request is allowed to proceed. */
  allowed: boolean;
  /** Requests remaining in the current window after this one. */
  remaining: number;
  /** Unix millis when the window resets. */
  reset: number;
  /** Configured request ceiling for this key. */
  limit: number;
}

function passThrough(key: RateLimitKey): RateLimitCheck {
  const cfg = RATE_LIMIT_POLICIES[key];
  // Parse the numeric portion of the window string for the synthetic
  // "reset" value. Windows are always authored as "<N> s".
  const windowSec = parseInt(cfg.window, 10);
  return {
    allowed: true,
    remaining: cfg.requests,
    reset: Date.now() + windowSec * 1000,
    limit: cfg.requests,
  };
}

/**
 * Check whether `identifier` may perform an action keyed by `key`.
 *
 * The call is a no-op unless `process.env.RATE_LIMIT_ENABLED === 'true'`
 * AND Upstash credentials are present. Either condition failing produces
 * a pass-through result with loud logging on the credential path.
 */
export async function checkRateLimit(
  key: RateLimitKey,
  identifier: string,
): Promise<RateLimitCheck> {
  if (process.env.RATE_LIMIT_ENABLED !== 'true') {
    return passThrough(key);
  }

  const limiter = getLimiter(key);
  if (!limiter) {
    // Credentials missing — already logged inside getRedis().
    return passThrough(key);
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: result.limit,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error(`[rate-limit] Upstash limit() failed for key=${key}: ${message}. Failing open.`);
    return passThrough(key);
  }
}

/**
 * Standard headers to attach to a 429 response. Mirrors the informal
 * X-RateLimit-* convention used by GitHub / Stripe / Twitter so client
 * tooling recognises the values without custom code.
 */
export function rateLimitHeaders(result: RateLimitCheck): Record<string, string> {
  const retryAfterSec = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
  return {
    'X-RateLimit-Limit':     String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(result.reset),
    'Retry-After':           String(retryAfterSec),
  };
}
