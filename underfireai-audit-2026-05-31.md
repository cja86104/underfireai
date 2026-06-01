# UnderFireAI Audit — 2026-05-31

## Summary

Read 91 in-scope files across API routes, middleware, lib, components/auth, components/settings, app/(auth), app/(dashboard), and types (excluding the explicitly skipped stripe, supabase, and callback paths). Found 12 findings total: 2 CRITICAL, 2 HIGH, 3 MEDIUM, 5 LOW. The codebase is in generally good shape — consistent auth gating on dashboard pages, solid input validation on most mutation routes, no hardcoded credentials, and meaningful error logging throughout. The most urgent issues are a missing env var in `.env.example` that would silently break TTS on any fresh deploy, and a resume extraction endpoint that calls AI without a purchase gate.

---

## Findings

### CRITICAL

- `lib/tts/openai-tts.ts` / `app/api/tts/route.ts` — `OPENAI_API_KEY` is used but absent from `.env.example`; `.env.example` still lists `CARTESIA_API_KEY=` from the prior TTS provider.
  Any developer who provisions the app from `.env.example` will never set `OPENAI_API_KEY`, the TTS route will return 503 on every call, and the misconfiguration will be invisible until a voice-mode session fails in production. No other part of the boot path checks for this key early.

- `app/api/resume/extract/route.ts:1` — This endpoint calls `createChatCompletion` (OpenRouter/DeepSeek) with no purchase gate and no rate limit.
  Every other AI-calling route in the codebase checks `subscription.hasPurchased` before making an AI call (upload, scan-vulnerabilities, suggestions, analyze-alignment, generate-scene, generate-interviewer). This endpoint is reachable by any authenticated free user and has no ceiling on how many times it can be called per hour.

---

### HIGH

- `app/api/negotiate/[sessionId]/end/route.ts:86` — `body.elapsed_seconds` is written to the DB as `duration_seconds: body.elapsed_seconds ?? 0` with no type check, finiteness check, or range clamp.
  The interview `/end` route validates elapsed_seconds thoroughly (typeof, isFinite, >= 0, then Math.round) before storing. This endpoint skips all of that — a client can write `NaN`, `Infinity`, or `99999999` into `negotiation_sessions.duration_seconds`, which would corrupt duration-based analytics and potentially break any downstream query that casts the field to an interval.

- `app/api/interview/[sessionId]/chat/route.ts:98-99` — The session is fetched twice in one request: once at line 76 with `.eq('user_id', user.id)` (ownership verified), and again at line 98 with `.select('*').eq('id', sessionId)` (no `user_id` filter).
  The second query relies on the first having succeeded, but it independently re-fetches session data without the ownership constraint. If a refactor ever reorders these two blocks, the second fetch becomes an unguarded read of any session ID. Not currently exploitable due to query ordering, but the pattern is fragile and the second query fetches the full `*` star of a wide row unnecessarily.

---

### MEDIUM

- `lib/ai/chat-client.ts:481` and `:502` — Two `console.log` calls are live in the `analyzeResponse()` function, which fires on every candidate message in a non-panel session.
  `console.log(\`[Analysis] Response received (attempt ${attempt}, len=${rawContent.length})\`)` and `console.log(\`[Analysis] Parsed scores:\`, {...})` will appear in Vercel function logs for every single analyzed answer in every active session. At any meaningful usage scale this floods the log stream and makes signal-to-noise unusable.

- `lib/webhooks/webhook-service.ts:347` — `Promise.allSettled(deliveryPromises).catch(console.error)` is fire-and-forget; the function returns `{ sent: true, webhookCount: webhooks.length }` immediately without awaiting delivery.
  In `app/api/interview/[sessionId]/score/route.ts:322`, this return value is used to set `webhook_sent = true` on the session score row. The flag will always be written as `true` if any webhooks are configured — regardless of whether any actually succeeded. A persistent delivery failure would be invisible in the score record.

- `negotiate/create/route.ts:45` — Comment reads `// $100,000.00 in cents — comfortably above any real offer` but the value is `10_000_000` in *dollars*. The client UI parses user input via `parseFloat` (not `/100`), the chat route formats `currentOfferAmount` directly via `Intl.NumberFormat` as dollars (`$10,000,000`), and no division by 100 occurs anywhere in the negotiation flow.
  The comment misidentifies the unit. A developer reading this will believe amounts are stored in cents and may write a cents-aware consumer that produces values 100× too small.

---

### LOW

- `app/layout.tsx:176` — `// eslint-disable-next-line react/no-danger` suppression for JSON-LD `dangerouslySetInnerHTML`.
  Per audit rules, every `eslint-disable` must be flagged. The suppression is documented and the payload is a static server-controlled object with no user input — the risk is near-zero — but it is a suppression nonetheless.

- `app/api/interview/generate-scene/route.ts:10-17` — `SCENE_STOCK_IMAGES` contains six hardcoded `https://images.unsplash.com/...` URLs.
  These are external CDN URLs baked into server code. If Unsplash changes a path, removes a photo, or rate-limits the referrer, the scene images will 404 silently in production with no fallback. They should live in env config or a database row.

- `lib/ai/config.ts:33` — `'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://underfireai.com'` — hardcoded production domain as a fallback in code.
  If `NEXT_PUBLIC_APP_URL` is unset (which `.env.example` allows since the value is blank), OpenRouter will receive a hardcoded referrer regardless of what environment the code is running in. Not a credential leak, but a hardcoded production URL in code is a smell.

- `components/settings/settings-tabs.tsx:37` — `/** @deprecated Use availableInterviews instead */` on `interviewsRemaining?: number` in `SettingsTabsProps`.
  The deprecated field is still passed by the settings page (`interviewsRemaining: subscription.availableInterviews`) and still part of the interface. Dead interface surface that could cause confusion.

- `app/api/interview/generate-scene/route.ts:60-62` — `body.rawText` is read with `const body = await request.json() as GenerateSceneRequest` after the auth and subscription checks, but `companyStyle` and `interviewType` are validated immediately after. No issue with the validation order itself, but the route has no max-length check on `companyStyle` or `interviewType` before passing them into the AI prompt (though both are validated against enum allowlists, so injection is blocked by that path). Minor: the absence of a length guard is inconsistent with other routes.

---

## Out-of-scope observations

- `app/api/stripe/`, `lib/stripe/`, `app/(auth)/callback/route.ts`, `components/auth/auth-form.tsx`, `lib/supabase/` — skipped per brief; all were covered in the May 30 audit.
- `lib/code-execution/language-wrappers.ts:126,167` — `console.log(JSON.stringify(__result))` lines are inside template literal strings that generate the Judge0 test harness code, not live server-side logging. Not a production smell — they are the mechanism by which Judge0 captures output.
- `lib/resume/vulnerability-scanner.ts:67,89` — bare `catch {}` blocks are part of an intentional multi-stage JSON repair loop (tries parse → trims → repairs brackets); each catch is annotated with a comment explaining the fallthrough. Not a swallowed error.
- `lib/ai/chat-client.ts:179` — bare `catch {}` inside `parseSSEChunk()` skips malformed SSE chunks. This is the correct behavior for streaming SSE parsing and is not swallowed silently.
- Dashboard layout (`app/(dashboard)/layout.tsx`) — correctly requires authentication via `getCurrentUser()` + redirect before rendering any child page. All individual dashboard pages that perform their own user check are consistent with this pattern.

---

## Questions

1. **`/api/resume/extract` gate** — Is this endpoint intentionally ungated? It appears to be called from the resume preview/insights flow after a user has already uploaded a resume. If it's meant to be an internal re-extraction tool, adding the `hasPurchased` check (or at minimum a rate limit matching `resumeUpload`) would make it consistent with every other AI endpoint. Was the missing gate an oversight or a deliberate product decision?

2. **Negotiation amounts — cents or dollars?** — The `negotiate/create` comment says "in cents" but all evidence (client `parseFloat`, server `Intl.NumberFormat` without `/100`, DB schema) says dollars. Should the comment be corrected, or is there a path that converts units that I didn't see?

3. **`CARTESIA_API_KEY` in `.env.example`** — Is there any code path that still uses Cartesia? The env example still lists the key, which could confuse someone who sees it and wonders if the TTS migration to OpenAI is complete.

---

## Files scanned

Read 91 files across the in-scope directories (API routes, middleware, lib, components/auth, components/settings, app/(auth), app/(dashboard), and types), excluding the explicitly skipped stripe, supabase, callback, and auth-form paths.
