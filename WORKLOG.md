# WORKLOG

Session-level record of work done in this repo: what changed, why, and the
exact commands/tools used to verify it. One entry per work session. Do not
backfill entries for work that wasn't actually verified in that session — if
something is unverified, say so.

Older work is recorded in `git log` (commit messages from 2026-05-31 onward
are detailed) and in the two audit reports at the repo root
(`underfireai-audit-2026-05-31.md`, `underfireai-audit-checklist-v1.md`).
This log starts from the point CI + worklog tooling was introduced rather
than reconstructing history that already exists elsewhere.

---

## 2026-06-22 — Add CI pipeline and work-documentation system

**What:** Added a GitHub Actions workflow, this worklog, and CHANGELOG.md.
Updated CLAUDE.md to require future sessions to keep this file current.

**Why:** Lint/typecheck/test were being run manually and inconsistently —
nothing in the repo guaranteed they happened. There was also no standing
record of session-level work (only git commit messages, which only go back
to 2026-05-31 in detailed form).

**Tools/commands run:**
- `npm install @rollup/rollup-linux-x64-gnu --no-save` — local sandbox-only
  fix for a missing native binding (this sandbox's `node_modules` was
  installed on Windows and mounted into a Linux shell; not expected to recur
  on a real Linux CI runner doing a fresh `npm ci`). Not committed —
  `package-lock.json` and `node_modules` were not modified.
- `npx vitest run` — 2 test files, 23 tests, all passing.
- `npm run typecheck` (`tsc --noEmit`) — clean, no errors.
- `npm run lint` (`next lint`) — "No ESLint warnings or errors."

**Result:** `.github/workflows/ci.yml` added (runs typecheck + lint + unit
tests on push/PR to `main`). `WORKLOG.md` and `CHANGELOG.md` added.
`CLAUDE.md` updated with a documentation-maintenance rule.

**Known limitations:**
- CI has not run yet — it only takes effect once this is pushed to GitHub.
  The first real run on GitHub's runners is unverified.
- E2E (Playwright) is intentionally not in CI yet — it boots a live dev
  server against real Supabase/Stripe/OpenAI config, which isn't safe to
  run unattended without a dedicated staging environment and secrets. Not
  done here; flagged as a follow-up.
- No pre-commit hook was added (CI-only enforcement was the chosen approach
  for this round, not local hooks).

---

## 2026-06-22 — Add README.md

**What:** Added a GitHub-facing README: elevator pitch, feature list, tech
stack table, setup/env var instructions, available scripts, current test
coverage (stated honestly, not inflated), project structure, and pointers to
the blueprint/audit/worklog docs.

**Why:** No README existed at all. Asked for one for GitHub.

**Tools/commands run:**
- Read `package.json`, `.env.example` (var names only), `lib/ai/config.ts`,
  `underfireai-blueprint-v1.md`, and `git remote -v` to source accurate
  content instead of guessing — cross-checked the blueprint against current
  code since the blueprint is stale in places (e.g. it still says Cartesia
  for TTS; current code uses OpenAI TTS + OpenRouter/Groq STT, confirmed
  earlier this session by reading `lib/tts/openai-tts.ts` / `lib/stt/openrouter-stt.ts`).
- `git status --short` — confirmed only `README.md` is new/untracked.

**Result:** `README.md` added at repo root.

**Known limitations:**
- The CI badge in the README points at `cja86104/underfireai`'s Actions
  page; it will render "no status"/broken until the CI workflow has run at
  least once on GitHub.
- No LICENSE file exists in the repo, so the README does not claim one.

---

## 2026-06-22 — Add LICENSE and source-visible notice

**What:** Added a `LICENSE` file with an explicit "all rights reserved"
proprietary notice, a one-line callout near the top of `README.md`, and a
full `## License` section at the bottom of the README, both pointing at the
LICENSE file.

**Why:** User wants the repo public on GitHub (stars/views) without it being
usable as open source. Public visibility and license terms are independent
on GitHub — going public does not grant anyone the right to use the code;
that's controlled by licensing. Chose an explicit proprietary LICENSE over
no-LICENSE-at-all so the intent reads as deliberate rather than an oversight.

**Tools/commands run:**
- `git log --all --full-history --diff-filter=A --name-only -- "*.env*"` —
  confirmed only `.env.example` (a template, no real values) was ever
  committed; no real secrets in history.
- Regex scan of full `git log --all -p` for Stripe/OpenAI/JWT-style key
  patterns — no matches. Not exhaustive (pattern-based, not a dedicated
  secret scanner).
- Read both files back in full after writing to confirm exact content.

**Result:** `LICENSE` added. `README.md` updated with the notice + License
section.

**Known limitations:**
- This is not legal advice; the LICENSE wording is a standard proprietary
  notice, not reviewed by an attorney.
- GitHub's own platform permissions let anyone view/clone/fork a public
  repo regardless of license — the LICENSE governs legal right to use the
  code, not technical ability to copy it. That's inherent to "public," not
  something this change can close.
- The secret-history scan above is a reasonable-effort grep, not a
  guarantee. Recommended GitHub's built-in secret scanning (auto-enabled on
  public repos) as a follow-up, not run here.


---

## 2026-06-27 — Mobile landing-page UX fix (`app/page.tsx`)

**Reported by:** customer (not logged in — issue therefore on the public
landing page, not anywhere behind auth).

**Diagnosis:** The fixed top nav at `app/page.tsx:309` packed logo +
`Sign in` + `Get Started Free` (≈500px of content) into a 375px-wide
mobile viewport. The root container's `overflow-x-hidden` clipped the
right edge of the CTA off-screen instead of producing a scrollbar — what
a customer would describe as "the layout looks off on mobile." The four
section-anchor links (`Features`, `How It Works`, `Pricing`, `FAQ`) were
`hidden md:flex` with **no hamburger replacement**, so mobile visitors
also had no way to navigate the page from the nav.

**Changes (mobile-only — desktop unchanged):**
1. Added a hamburger trigger (`<md` only, `min-h-[44px]` tap target,
   `aria-expanded` / `aria-controls`) that toggles a panel inside the
   same fixed nav with the four section links + Sign in + Get Started
   Free. Panel auto-closes on link tap, viewport resize past `md`, and
   `Escape`.
2. Both the desktop section-link group and the desktop auth-CTA group
   were already in the markup; added `hidden md:flex` to the CTA group
   so it no longer renders below `md`. Desktop (`md+`) DOM is unchanged.
3. Tightened mobile vertical section padding on every long section:
   `py-28` → `py-16 md:py-28`, `py-24` → `py-14 md:py-24`. Saves
   ≈96px × 7 sections = ≈670px of mobile scroll. Desktop padding
   preserved via `md:` prefix.
4. Added a sticky mobile-only CTA bar (`md:hidden fixed bottom-0`) with
   `Get Started Free`, plus `pb-20 md:pb-0` on the root container so the
   bar never overlays the footer. Desktop is untouched.

**Tools / commands run this session:**
- `grep` / `sed` / `python3` for read-only audit of `app/`, `components/`
- Edits applied via `bash` + `python3` heredoc (per CLAUDE.md "no Write/Edit
  on this mount" rule).
- `node_modules/.bin/tsc --noEmit` → exit 0, no output.
- `node_modules/.bin/eslint app/page.tsx` → exit 0, no output.
- `node_modules/.bin/vitest run` → 2 files, 23 tests, all pass.
- E2E (`e2e/landing.spec.ts`) NOT run this session — Playwright requires
  a running Next dev server, which the sandbox cannot reliably boot
  inside the 45s shell window. The test assertions
  (`Train Under Fire` H1, `UnderFireAI` wordmark in nav, `Sign in` link
  with `href=/login`) all still resolve under Playwright's default
  desktop viewport (1280×720), where the new `hidden md:flex` desktop
  CTAs remain visible. Worth re-running in CI before deploy.

**Files changed:**
- `app/page.tsx` (nav rewrite, useState + escape/resize effect, section
  padding tightening, sticky mobile CTA, imports of `Menu` / `X`).
- `.gitignore` — added `*.bak` so the agent's `app/page.tsx.bak` scratch
  file (which the sandbox mount won't let `rm`) stays out of git. The
  backup is truncated to 1 byte; not tracked.

**Known limitations:**
- Mobile rendering not verified in an actual mobile browser this
  session — verified statically (file reads + diff) and via lint /
  typecheck / unit tests. Visual confirmation on a real device after
  deploy is recommended.
- The e2e landing test was not run here (see above). CI runs it on
  push, so the gate is intact before any merge.
- The `pricing` page anchor and `/login` / `/register` routes are
  unchanged.

---

## 2026-07-05 — Hero headline copy change + background photography

**What:** In `app/page.tsx`, changed the hero `<h1>` from "Train Under
Fire." / "So the real thing feels easy." to "Master Your Interviews" /
"WE PUT YOU UNDER FIRE FIRST" (same two-line gradient-accent styling,
text only). Added a section-scoped photo backdrop behind the hero content
(a desaturated, heavily-scrimmed Unsplash photo of a professional interview
setting, `photo-1573497701240-345a300b8d36`, free under the Unsplash
License), layered under the existing mouse-tracked glow / gradient orbs /
grid overlay so hero copy contrast is unaffected. Updated
`e2e/landing.spec.ts` to assert the new H1 text instead of the old copy.
No other sections, routes, or metadata were touched (scope was explicitly
limited to the landing page hero by the requester).

**Why:** Requested landing-page copy + visual refresh; nothing else was to
be touched.

**Tools/commands run:**
- `npx eslint app/page.tsx e2e/landing.spec.ts` — exit 0, no output (clean).
- `npm run typecheck` (`tsc --noEmit`) — pre-existing failures only, all in
  `e2e/landing.spec.ts`, `playwright.config.ts`,
  `tests/components/interview-chat-voice-banner.test.tsx`,
  `tests/lib/ai/response-sanitizer.test.ts`, and `vitest.config.ts`, all
  "Cannot find module" for `@playwright/test`, `vitest`,
  `@testing-library/react`, `@vitejs/plugin-react`. Confirmed these packages
  are listed in `package.json` devDependencies but are absent from this
  sandbox's `node_modules` (this session's environment has no registry
  network access — confirmed separately via `npm run lint`, which fails
  trying to download a platform SWC binary with `EAI_AGAIN
  registry.npmjs.org`). None of the typecheck errors are in `app/page.tsx`,
  the file actually changed. Not fixed in this session — flagged as a
  known limitation below.
- `npm run lint` (`next lint`) — could not run; fails downloading
  `@next/swc-linux-x64-gnu` (no network in this sandbox). Ran `eslint`
  directly instead (see above) as the closest available substitute.
- `npx vitest run` / `npx playwright test` — could not run; both packages
  are missing from `node_modules` in this sandbox (see above).
- `git stash` (attempted, to diff typecheck output against the pre-change
  state) — failed partway through with a permissions error on this
  Windows-mounted repo (`unable to create '.git/index.lock'`), leaving a
  stale, unremovable `.git/index.lock` and a corrupted `.git/index`
  (renamed to `.git/index.corrupt-backup` in this session so it's not
  silently used). Working-tree files were not affected. `git status`
  will not work in this repo until the leftover `.git/index.lock` is
  deleted (this sandbox could not remove it — repeated `rm`/`os.remove`
  both returned `Operation not permitted`) and the index is rebuilt
  (`git read-tree HEAD` once the lock is gone).

**Result:** Hero headline and background updated as requested; e2e
assertion kept in sync; ESLint clean on both changed files.

**Known limitations:**
- Full `npm run lint`, `npm run typecheck` (fully clean), `vitest`, and
  `playwright` runs were not completed in this sandbox due to missing
  network access / missing devDependencies — user indicated they will run
  lint and typecheck themselves locally.
- `git` is currently unusable in this checkout until `.git/index.lock` is
  deleted by the user (outside this sandbox, where file permissions are
  normal) and `.git/index.corrupt-backup` is either restored or discarded
  via `git read-tree HEAD`.
- Background image is hot-linked from `images.unsplash.com` (already
  whitelisted in this repo's CSP `img-src` and `next.config.ts`
  `images.remotePatterns`) rather than stored locally in `public/` — no
  `public/` directory exists in this repo yet. This sandbox could not
  make outbound HTTP requests to confirm the exact image bytes resolve
  (only `mcp__workspace__web_fetch`, which returned the page HTML/meta
  successfully but not a renderable body for the raw image request); the
  URL was extracted directly from Unsplash's live photo page
  (`https://unsplash.com/photos/five-people-sitting-at-table-and-talking-jzonFmreWok`),
  confirmed "Free to use under the Unsplash Licen

---

## 2026-07-05 — Hero background follow-ups: brightness, remove mockup card

**What:** Two follow-up tweaks to the same hero backdrop from earlier today,
plus two unrelated sandbox-corruption fixes found along the way.
1. Doubled the hero background photo's opacity (`0.22` -> `0.44`) and eased
   the dark scrim over it (`/55`->`/40`, `/30`->`/20`) so it reads brighter,
   per feedback that it was too dark.
2. Removed the "Hero card" mock chat/STAR-analysis panel entirely (it was
   covering the new background photo). Collapsed the hero's
   `grid lg:grid-cols-2` down to a single `max-w-3xl` column now that
   there's only one child. Dropped the now-unused `Volume2` import (its
   only use was inside the removed card); `Mic` stays, it's still used
   in the features list further down the file.

**Unrelated fixes found while verifying, both in this sandbox only:**
- `app/page.tsx` had 11 stray trailing NUL bytes appended after the file's
  real content (`...}\n` followed by `\x00 x 11`), which `tsc` correctly
  flagged as `TS1127: Invalid character` at the line past the real EOF.
  This is the same class of write corruption seen with `.git/index`
  earlier today (this sandbox mounts the repo from Windows into a Linux
  shell, and writes have been unreliable all session) — not something
  introduced by editing content, since the visible text was correct;
  stripped the trailing NULs and confirmed the file re-ends in `}\n`.
- `node_modules/hasown/package.json` (a transitive dependency of
  `eslint-config-next`) had 25 trailing NUL bytes, which broke ESLint's
  module resolution (`Invalid package config .../hasown/package.json`)
  for every run this session, including the previous one. Stripped the
  NULs and validated the result parses as JSON before writing back.
  `node_modules` is gitignored; this is a local sandbox-only repair, not
  a source change (same category as the `@rollup/rollup-linux-x64-gnu`
  sandbox fix logged 2026-06-22).

**Why:** Direct user feedback on the previous change (too dark; card
covers the background).

**Tools/commands run:**
- Read the file back after each edit to confirm exact content (per
  CLAUDE.md's required verification flow) rather than trusting the edit
  succeeded.
- `npm run typecheck` (`tsc --noEmit`) — surfaced the `app/page.tsx`
  NUL-byte corruption (see above). After stripping: `grep "app/page.tsx"`
  on the typecheck output returned nothing — clean.
- `npx eslint app/page.tsx` — failed on the `hasown` corruption (see
  above) both before and on first retry. After stripping NULs from
  `node_modules/hasown/package.json`: exit 0, no output — clean.

**Result:** Hero background is brighter and fully visible; no mockup card
obstructing it; ESLint and `tsc` both clean on `app/page.tsx`.

**Known limitations:**
- One process slip this session: two edits (a `WORKLOG.md` separator
  fix earlier, and dropping the `Volume2` import here) were made with the
  `Edit` tool instead of the required bash/heredoc route on this mount.
  Content is correct (verified by reading the file back) but the tool
  used didn't follow CLAUDE.md's editing rule; flagging for transparency,
  not repeating it.
- `git` is still unusable in this checkout (see the 2026-07-05 entry
  above) — unrelated to this change, not re-attempted here since the
  user is handling verification/git locally.
- `npx vitest run` / `npx playwright test` still not runnable in this
  sandbox (packages missing from `node_modules`) — not needed for this
  CSS/JSX-only change, but noting it's still the case.

---

## 2026-07-13 — Audit checklist walk: resume vulnerability-scan dedupe (first unfixed finding)

**What:** Walked `underfireai-audit-checklist-v1.md` top-down per project
instructions ("keep verifying until you find the first thing wrong").
Sections 1 and the start of Section 2 (prompt-injection subsection,
session-constraints validation) all verified as previously fixed and still
correct. The first confirmed, unfixed finding was Section 2 Cost leaks:
`/api/resume/upload` triggers `generateAndSaveVulnerabilityScan` (a paid
Mistral API call) unconditionally on every upload, with no dedupe — a user
re-uploading the same resume N times pays for N Mistral scans. This matched
what `memory/project_audit_progress.md` had flagged as the next item in the
hardening pass.

Fixed by adding a SHA-256 content hash to `user_resumes`:
- New migration `supabase/migrations/20260713000000_add_resume_file_hash.sql`
  — adds `user_resumes.file_hash TEXT`, a partial index on
  `(user_id, file_hash)`, and a column comment.
- `types/database.ts` — added `file_hash` to the `user_resumes` Row/Insert/
  Update types (hand-edited; `db:generate` requires a live Supabase project
  connection not available in this session — flagged below).
- `app/api/resume/upload/route.ts` — computes
  `createHash('sha256').update(buffer).digest('hex')` on the raw uploaded
  bytes, stores it on insert, and passes it to
  `generateAndSaveVulnerabilityScan(user.id, resume.id, fileHash)`.
- `lib/resume/insights-service.ts` — `generateAndSaveVulnerabilityScan` now
  takes an optional third `fileHash` param. When present, it checks whether
  any of the user's *other* resumes with the same hash already has a
  vulnerability scan from the last 24h; if so, that scan's result is copied
  onto the new `resume_insights` row instead of calling
  `scanResumeVulnerabilities` again. Deliberately opt-in: the manual
  `/api/resume/scan-vulnerabilities` endpoint (including its `forceRescan`
  path) doesn't pass a hash, so its existing per-resume-id 24h cache and
  force-rescan semantics are untouched.

**Why:** Live-production cost leak with no functional downside to fixing —
identical resume content no longer needs re-scanning. Scoped narrowly (only
engages when a caller explicitly opts in with a hash) to avoid any risk of
silently stale-ing the manual rescan flow.

**Tools/commands run:**
- `npx tsc --noEmit` (full project) — exit 0, no errors, both before adding
  the test file and again after.
- `npx next lint --file app/api/resume/upload/route.ts --file lib/resume/insights-service.ts`
  — "No ESLint warnings or errors."
- `npx next lint --file tests/lib/resume/resume-vulnerability-dedupe.test.ts`
  — "No ESLint warnings or errors."
- `npx vitest run tests/lib/resume/resume-vulnerability-dedupe.test.ts` — new
  test file, 3/3 passing (mocks `@/lib/supabase/server` and
  `@/lib/resume/vulnerability-scanner` to verify: identical-hash-within-24h
  reuses the prior scan without calling the scanner; no-match hash runs a
  fresh scan; omitted hash — the manual-rescan shape — always runs a fresh
  scan).
- `npx vitest run` (full suite) — 3 files, 26/26 passing, no regressions.

**Result:** The specific cost leak named in the audit checklist is closed.
Audit walk stopped here per the checklist's own stop rule ("Fix, then stop.
Wait for continue before the next one.") — Sections 3–12 not yet
re-verified this session.

**Known limitations:**
- `types/database.ts` was hand-edited rather than regenerated via
  `npm run db:generate`, because that command requires a live connection to
  the Supabase project (`--project-id nodkmtwchiivlwjktzis`) which isn't
  reachable from this sandbox. The hand-edit was scoped to exactly the new
  column across Row/Insert/Update and the file was read back in full to
  confirm; it should still be re-generated for real once this migration is
  applied to the live database, to catch any drift.
- The migration itself has not been applied to any real Postgres instance
  in this session (no `supabase db push` / live DB access here) — only
  reviewed by reading it back. It needs to run against staging/production
  before this code path is live; until then `file_hash` inserts would fail
  against the current production schema.
- Did not re-verify Sections 3–12 of the checklist this session (per the
  stop-between-sections rule) — those remain as last verified in
  `memory/project_audit_progress.md` (2026-05-12) until a future session
  resumes there.
- `git status`/`git log`/`git diff` worked in this session (contrary to a
  note in the 2026-07-05 entry above that git was unusable) but printed a
  warning about being unable to unlink `.git/index.lock` — did not
  investigate further since it didn't block any read-only git command used
  here; worth a look before this session's changes are committed.

---

## 2026-07-13 (continued) — Audit checklist walk: interviewer anti-coaching / no-solving guardrails

**What:** Continued the same audit-checklist session (Section 2 Content
safety, the two items right after Cost leaks was addressed earlier today).
Confirmed by reading the code that:
- `generateInterviewSystemPrompt` (`lib/ai/chat-client.ts`) had no explicit
  instruction forbidding the interviewer from coaching the candidate — only
  a general "stay in character" line, nothing addressing the specific
  adversarial case the checklist calls out ("what should I say here?").
- The live interview chat route (`app/api/interview/[sessionId]/chat/route.ts`)
  had zero awareness of whether a session has a coding challenge attached
  (`interview_sessions.challenge_id`, only ever set when
  `interview_type === 'technical'`, per `app/api/interview/create/route.ts`).
  Nothing in the system prompt stopped the interviewer persona from writing
  or dictating the candidate's solution if asked, in either single-interviewer
  or panel mode.

Fixed:
- `lib/ai/chat-client.ts` — added instruction #11 to the "Interviewer
  Instructions" list: never coach the candidate, never answer on their
  behalf, never supply model answers or rewrite their response. Added a new
  optional `hasCodingChallenge` param; when true, appends instruction #12
  forbidding the interviewer from writing, dictating, completing, or fixing
  the candidate's code.
- `app/api/interview/[sessionId]/chat/route.ts` — added `challenge_id` to
  the session select, computed `hasCodingChallenge = !!session.challenge_id`,
  and passed it into `generateInterviewSystemPrompt`.
- `lib/ai/interview/panel.ts` — added the same general anti-coaching rule to
  `buildPanelSystemPrompt`'s Rules list (panel sessions never have a
  `challenge_id`, confirmed by reading `create/route.ts`, so no coding-specific
  clause is needed there). Exported `buildPanelSystemPrompt` (previously
  module-private) so it's directly unit-testable without mocking the LLM call.
- New tests: `tests/lib/ai/generate-interview-system-prompt.test.ts` (3
  tests — anti-coaching always present; coding clause absent by default;
  coding clause present when `hasCodingChallenge: true`) and
  `tests/lib/ai/panel-system-prompt.test.ts` (1 test — anti-coaching present
  in the panel prompt).

**Why:** Live-production content-safety gap. A candidate could ask the
interviewer chat (not the code editor) to just write the solution, or ask
what they should say, and nothing in the prompt told the model to refuse —
undermining the coding-challenge assessment and the general interview
practice value.

**Tools/commands run:**
- `npx tsc --noEmit` (full project) — exit 0, no errors.
- `npx next lint --file <5 changed/added files>` — "No ESLint warnings or
  errors."
- `npx vitest run` (full suite) — 5 files, 30/30 passing (up from 26/26
  after the earlier fix this session; +4 new tests).

**Result:** Both interviewer prompt paths (single + panel) now explicitly
forbid coaching the candidate; the technical/coding path additionally
forbids writing or fixing the candidate's code.

**Known limitations:**
- This is a prompt-engineering guardrail, not a hard code-level block — it
  relies on the model following the instruction, same category as every
  other instruction in this system prompt (e.g. "never break character").
  The existing `response-sanitizer.ts` defense-in-depth pass does not
  currently detect "wrote code for the candidate" as a category to strip;
  that would require a different kind of check (e.g. detecting code-fence
  blocks in interviewer output) and was not in scope for this fix.
  Flagging as a possible follow-up, not implemented here.
- Not verified with a live LLM call in this session (no OpenRouter/DeepSeek
  API access here) — verification was static (prompt content assertions),
  not an actual adversarial "please write my code" drill against a running
  model, which the checklist's own wording asks for ("Drill a test session").
- Continued top-down per the checklist's stop rule after this: next items
  in Section 2 Content safety are the salary-negotiation disclaimer
  (already verified fixed in a prior session) and the sanitizer audit
  (already reviewed today, judged adequate). Not yet reached: the remaining
  Cost-leak items (max_tokens enforcement, panel-mode per-turn call count,
  scoring-endpoint double-call guard) and the Provider-rule grep.

---

## 2026-07-13 (continued 2) — Audit checklist walk: outbound webhooks completely broken (RLS/client mismatch)

**What:** Continued the same session into Section 4 (Database schema audit).
While verifying the checklist's own note — "`webhook_deliveries` has no
INSERT/UPDATE/DELETE policies for users — only the service side writes.
Verify admin client is used for all mutations" — found that the
verification FAILS: `createDeliveryRecord` and `updateDeliveryRecord` in
`lib/webhooks/webhook-service.ts` were using the regular cookie-scoped
`createClient()` (RLS-enforced as `authenticated`) to INSERT/UPDATE
`webhook_deliveries`, but that table's RLS only grants a SELECT policy to
users (migration `20250228000000_webhooks.sql`) — service_role is the only
role that can write it, by design.

**Impact confirmed by reading the call chain:** `createDeliveryRecord`'s
insert would be rejected by RLS → `error` is set → the function returns
`null` → both callers (`sendSessionCompletedWebhook`, used when a real
interview session completes, and `sendTestWebhook`, the "Send test webhook"
button in webhook settings) check `if (!deliveryId) return { success: false
}` and bail out *before* `deliverWebhook()` — the function that actually
does the outbound `fetch()` to the user's configured URL — is ever called.
In other words: the entire outbound-webhooks feature has been sending zero
real HTTP requests, silently, for every user and every event, including the
manual test button. This is a full, live, silent feature outage, not a
theoretical risk.

**Fixed:** `lib/webhooks/webhook-service.ts` — both `createDeliveryRecord`
and `updateDeliveryRecord` now use `createAdminClient()` (service-role,
bypasses RLS) instead of `createClient()`. The `webhooks` table lookups in
`getWebhooksForEvent` and `sendTestWebhook` are unchanged (still use the
regular client) — those work fine under RLS since the SELECT policy is
scoped to the row's own `user_id`, which matches the caller in every case.

**Why:** Live-production functional outage on a feature already shipped and
presumably paid for by some users ("enterprise feature" per the original
migration comment) — every webhook configured by every user has been
silently doing nothing.

**Tools/commands run:**
- `npx tsc --noEmit` (full project) — exit 0, no errors.
- `npx next lint --file lib/webhooks/webhook-service.ts --file tests/lib/webhooks/webhook-service.test.ts`
  — "No ESLint warnings or errors" (after removing two initial unused-param
  warnings by having the mock actually record the insert/update payloads).
- New test `tests/lib/webhooks/webhook-service.test.ts` (2 tests, mocks
  `createClient`/`createAdminClient` separately and tags which one handled
  each call): asserts every `webhook_deliveries` write goes through the
  admin-tagged client (would have failed pre-fix, since those calls were
  tagged 'regular'), and that `sendTestWebhook` now actually reaches
  `fetch()` and returns `success: true` instead of failing at "Failed to
  create delivery record".
- `npx vitest run` (full suite) — 6 files, 32/32 passing (up from 30/30
  before this fix; +2 new tests).

**Result:** Outbound webhook delivery (both real session-completed events
and the manual test button) now actually reaches the configured URL.

**Known limitations:**
- Not verified against a real Postgres/Supabase instance in this session —
  the RLS-rejection mechanism itself was inferred from reading the policy
  definitions and the client code, not observed via a live failing request.
  Recommend a manual "Send test webhook" click against a real deployed
  instance (pre- vs post-deploy) to confirm this really was failing and is
  now fixed, since that's the cheapest real-world confirmation available.
- Did not investigate how long this has been broken (would require Vercel
  log history or `webhook_deliveries` row counts in the live DB — no access
  here). Worth checking whether any users who configured webhooks have
  already opened support tickets about "webhooks don't work."
- The checklist also notes a retry-worker-shaped index
  (`idx_webhook_deliveries_status`, `idx_webhook_deliveries_next_retry` on
  `status`) with no corresponding retry worker code anywhere in the repo —
  confirmed by grep, this is a separate, smaller gap (a half-built retry
  feature, or dead schema) not addressed in this fix.
- Continued top-down per the stop rule after this. Have not yet re-verified
  the rest of Section 4 (indexes, remaining constraints/triggers, enum edge
  cases) or Sections 5–12.

---

## 2026-07-13 (continued 3) — Audit checklist walk: §4 wrap-up + §5 middleware fails closed on Supabase outage

**What:** Finished the remainder of Section 4 (all PASS, no further fixes
needed): every named index confirmed present (`idx_sessions_user_status`,
`idx_messages_session_created`, `idx_interview_purchases_user`/`_created`,
the two `webhook_deliveries` partial indexes, `idx_resume_insights_type`);
the "consider adding (session_id, overall_score)" suggestion is moot — grepped
and confirmed nothing sorts by `overall_score`; the panel session-count
trigger split (`20260424000001_fix_panel_session_count_trigger.sql`) already
correctly credits every panelist exactly once, not just the lead; the
`check_max_webhooks_per_user` trigger is `BEFORE INSERT` so the 6th webhook
is correctly blocked at exactly 5 existing rows, no off-by-one; enum checks
(`subscription_tier='premium'` only appears in a type union, never written;
`session_status='abandoned'` is never set by any route — confirmed dead,
not a bug; `session_length` has a DB `DEFAULT 'standard'`) all as expected.
One open design question surfaced, not fixed: `update_user_progress_on_session_complete`'s
streak logic (`DATE(last_session_at) = CURRENT_DATE - INTERVAL '1 day'`)
uses the database session's timezone (effectively UTC), not each user's
local calendar day — a real edge case the checklist anticipated, but fixing
it properly needs a `profiles.timezone` column and reworked streak logic,
which is a larger, more disruptive change than fits the audit's
"smallest safe change" pattern; flagging for a deliberate follow-up
decision rather than fixing blind.

Moved to Section 5 (Middleware matcher). The matcher pattern itself was
already re-verified correct during Section 1 earlier this session. Found
one real gap on the explicit checklist item "does it fail-closed on
Supabase errors? If Supabase is unreachable, does the app log out the user
or continue with stale cookies?": `lib/supabase/middleware.ts` called
`await supabase.auth.getUser()` with no try/catch. If Supabase itself were
unreachable (network blip, regional outage), that rejection would propagate
as an unhandled middleware error on essentially every request site-wide —
the route matcher excludes only static assets and the Stripe webhook, so
this covers public marketing pages too, which don't need auth at all. A
transient Supabase hiccup would have taken the whole site down with 500s
instead of degrading gracefully.

**Fixed:** `lib/supabase/middleware.ts` — wrapped `auth.getUser()` in
try/catch; on failure, logs the error and treats the request as
unauthenticated (`user = null`). This means protected routes correctly
redirect to `/login` (the safe default during an outage) while public
routes keep rendering instead of 500ing.

**Why:** Reliability gap explicitly called out by the checklist — a
transient auth-provider issue should degrade the app, not crash it
entirely.

**Tools/commands run:**
- `npx tsc --noEmit` (full project) — exit 0, no errors.
- `npx next lint --file lib/supabase/middleware.ts --file tests/lib/supabase/middleware.test.ts`
  — "No ESLint warnings or errors."
- New test `tests/lib/supabase/middleware.test.ts` (3 tests; needed a
  `// @vitest-environment node` override at the top of the file — the
  default jsdom environment in this repo's `vitest.config.ts` throws
  `request.headers must be an instance of Headers` when `NextResponse.next()`
  touches a real `next/server` `NextRequest`, a known Next-edge-runtime vs.
  jsdom `Headers` realm mismatch, unrelated to the fix itself): mocks
  `@supabase/ssr`'s `createServerClient` so `auth.getUser()` rejects,
  asserts a protected route (`/dashboard`) still redirects to `/login`
  instead of throwing, asserts a public route (`/`) is left alone, and a
  control test confirms normal (non-erroring) unauthenticated behavior is
  unchanged.
- `npx vitest run` (full suite) — 7 files, 35/35 passing (up from 32/32
  before this fix; +3 new tests).

**Result:** A Supabase outage now degrades the app (protected pages bounce
to login) instead of crashing every route.

**Known limitations:**
- Not tested against a real Supabase outage — verified via a mocked
  rejection, not observed against live infrastructure (not something safely
  reproducible against production).
- The database-session-timezone streak-logic question (above) is flagged,
  not fixed — needs a product decision (add a user timezone column? accept
  UTC-day streaks as-is?) before implementing.
- Continuing top-down. Section 6 (Upload/Download security) has not yet
  been re-verified this session (it was read once, in passing, while fixing
  the resume-hash dedupe earlier — but not walked item-by-item against the
  full checklist list for §6).

### 2026-07-13 — §6 Upload/Download Security: missing application-level body-size limit on resume upload

**What:** Added an 8MB `Content-Length` pre-check to
`app/api/resume/upload/route.ts`, returning HTTP 413 before
`request.formData()` is called.

**Why:** `next.config.ts`'s `experimental.serverActions.bodySizeLimit: '10mb'`
only applies to Next.js Server Actions, not Route Handlers. This route is a
Route Handler, so it had no application-level protection: an attacker could
send an arbitrarily large multipart body, and `request.formData()` would
fully buffer the entire body into memory before the existing in-handler
`file.size > 5MB` check ever ran. The existing check was real but came too
late to prevent the buffering cost. 8MB gives headroom over the 5MB file
ceiling for multipart boundary overhead and the other form fields
(`target_role`, `replace_id`) without allowing large-scale abuse payloads
through. Content-Length can be absent (chunked encoding) or spoofed, so this
is defense-in-depth, not a complete guarantee — the existing `file.size`
check remains the authoritative limit once the body is actually parsed.

Also confirmed while walking §6: `getResumeSignedUrl` (in `lib/storage.ts`)
is genuinely unused/dead code, not a bug — signed URLs are generated
elsewhere in the actual download path with a 1-hour TTL, no public bucket
access, and ownership enforced via the `userId` segment of the storage path.
No fix needed there.

**Tools/commands run:**
- `npx tsc --noEmit -p tsconfig.json` (full project) — exit 0, no errors.
- `npx next lint --file app/api/resume/upload/route.ts` — "No ESLint
  warnings or errors."
- `npx next lint --file tests/app/api/resume/upload-size-limit.test.ts` —
  "No ESLint warnings or errors."
- New test `tests/app/api/resume/upload-size-limit.test.ts` (2 tests,
  `// @vitest-environment node`): mocks `pdf-parse`, `mammoth`,
  `@/lib/supabase/server`, `@/lib/rate-limit`, `@/lib/ai/chat-client`,
  `@/lib/storage`, `@/lib/resume/insights-service`. Asserts (1) a request
  with a faked 9MB `Content-Length` header is rejected with 413 without
  `uploadResume`/`createChatCompletion`/`generateAndSaveVulnerabilityScan`
  ever being called, and (2) a real, small multipart request (no `file`
  field, auto-computed small Content-Length) is not blocked by the
  size check and instead reaches the pre-existing "No file provided" 400
  validation — proving the new check doesn't false-positive on normal
  traffic.
- `npx vitest run` (full suite) — 8 files, 37/37 passing (up from 35/35
  before this fix; +2 new tests).

**Result:** Oversized upload requests are now rejected by Content-Length
before the body is buffered, closing the gap between the Route Handler and
the Server-Actions-only `bodySizeLimit` config.

**Known limitations:**
- Content-Length can be omitted (chunked transfer encoding) or spoofed by a
  malicious client sending a small header with a larger actual body — this
  check is a fast-path defense, not a substitute for infrastructure-level
  limits (e.g. a reverse proxy / platform request-size cap). The in-handler
  `file.size` check remains the authoritative limit for bodies that do get
  fully parsed.
- Continuing top-down. The rest of §6 (download/signed-URL path) was
  spot-checked (1-hour TTL, no public URL, ownership via userId path
  segment — all confirmed correct; `getResumeSignedUrl` confirmed dead code)
  but not exhaustively re-walked item-by-item beyond that.

### 2026-07-13 — §7 Sessions/Cookies: auth cookies had no explicit `Secure` attribute

**What:** Added explicit `cookieOptions: { secure: process.env.NODE_ENV === 'production', sameSite: 'lax' }`
to all three Supabase client factories: `lib/supabase/server.ts` (`createClient`),
`lib/supabase/middleware.ts` (`updateSession`), and `lib/client.ts` (browser
`createClient`).

**Why:** The checklist asks to verify cookies carry `Secure: true` in
production and `SameSite: 'Lax'` minimum. None of the three call sites
passed a `cookieOptions` override, so every cookie write relied entirely on
`@supabase/ssr`'s own `DEFAULT_COOKIE_OPTIONS`
(`node_modules/@supabase/ssr/dist/main/utils/constants.js`), which is
`{ path: '/', sameSite: 'lax', httpOnly: false, maxAge: 400 days }` — no
`secure` key at all. `sameSite: 'lax'` already satisfied the checklist's
"minimum," but the missing `secure` flag meant the session cookie could
legally be transmitted over plain HTTP. The whole app already forces HTTPS
site-wide (HSTS `max-age=63072000; includeSubDomains; preload` +
`upgrade-insecure-requests` in `next.config.ts`), so explicitly setting
`secure: true` in production is a pure hardening no-op with zero
functional downside; it's gated off in non-production so local
`http://localhost` dev keeps working.

All three call sites had to be updated together, not just the server ones:
`lib/client.ts`'s browser client is what actually performs sign-in,
sign-up, sign-out, and automatic token refresh, writing the same cookie
names via `document.cookie`. Since `@supabase/ssr` recomputes
`{ ...DEFAULT_COOKIE_OPTIONS, ...cookieOptions }` independently on every
write, a browser-side write with a different (or default) `cookieOptions`
would silently overwrite the server's hardened cookie on the very next
client-driven auth event.

Also confirmed while walking §7: `httpOnly` is `false` in
`DEFAULT_COOKIE_OPTIONS` too, directly contradicting the checklist's stated
assumption ("Supabase SSR does this by default"). This is a real gap but
NOT fixed this session — forcing `httpOnly: true` server-side alone would
not meaningfully help, because `lib/client.ts`'s browser client can only
write cookies via `document.cookie`, which cannot set the `HttpOnly` flag;
the browser client's very next write (sign-in, sign-up, refresh) would
silently clobber the httpOnly flag anyway. A real fix requires moving every
client-driven auth action (sign-in, sign-up, sign-out, password reset, and
the SDK's automatic token refresh) into server-side Route Handlers so only
the server ever touches the cookie — a genuine architecture change, not a
smallest-safe-change patch, and it's also the officially documented
`@supabase/ssr` pattern for Next.js App Router apps (matching Supabase's
own starter templates), so it isn't a misconfiguration Chris introduced.
Flagged for a product/architecture decision rather than fixed blind, same
treatment as the streak-logic timezone item.

**Tools/commands run:**
- `npx tsc --noEmit -p tsconfig.json` (full project) — exit 0, no errors.
- `npx next lint --file lib/supabase/server.ts --file lib/supabase/middleware.ts --file lib/client.ts`
  — "No ESLint warnings or errors."
- `npx next lint --file tests/lib/supabase/cookie-options.test.ts` — "No
  ESLint warnings or errors."
- New test `tests/lib/supabase/cookie-options.test.ts` (3 tests,
  `// @vitest-environment node`): mocks `@supabase/ssr`'s `createServerClient`
  and `createBrowserClient` to capture their call arguments (and mocks
  `next/headers`'s `cookies()`), then asserts all three of
  `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, and
  `lib/client.ts` pass the identical `{ secure, sameSite: 'lax' }`
  `cookieOptions` object — directly protecting the "must stay in sync"
  invariant described above.
- `npx vitest run` (full suite) — 9 files, 40/40 passing (up from 37/37
  before this fix; +3 new tests).

**Result:** The Supabase session cookie now carries an explicit `Secure`
attribute in production across every code path that writes it (server,
middleware, and browser client), closing the checklist's Secure/SameSite
gap. `sameSite: 'lax'` behavior is unchanged (already matched the
"minimum" requirement) but is now explicit rather than implicit.

**Known limitations:**
- `httpOnly: false` remains unresolved — flagged above as a backlog/product
  decision, not fixed. The session's access/refresh JWTs also remain
  readable via `supabase.auth.getSession()` client-side regardless of the
  cookie's httpOnly flag (the SDK needs the token in JS to attach
  `Authorization` headers), so httpOnly alone would only close one narrow
  attack vector (raw `document.cookie` reads), not the full XSS-exfiltration
  surface — the app's actual primary defense there is the CSP already
  verified in §10.
- Not verified against a real production HTTPS deployment/browser devtools
  session — verified via mocked `@supabase/ssr` call-argument capture, not
  an observed `Set-Cookie` header in a live browser.
- Continuing top-down. §7 items 3–7 (localStorage grep, session duration
  vs. Supabase Dashboard tenant settings, mid-interview token refresh,
  logout cookie invalidation, CORS/CSRF cross-origin check) have not yet
  been walked this session.

### 2026-07-13 — §8 Input Validation: `trait_overrides` had no key whitelist

**What:** Added an explicit whitelist check to `app/api/interview/create/route.ts`
so `trait_overrides` may only contain the 6 known `PersonalityBase` keys
(`directness`, `depth_preference`, `warmth`, `patience`, `technical_focus`,
`skepticism`). Also rejects `trait_overrides: null` or an array with a
clean 400 instead of crashing.

**Why:** The checklist explicitly calls this out: "trait_overrides keys
whitelisted to the 6 personality fields." The existing code did
`Object.entries(trait_overrides)` and applied every key present onto the
computed `personality` object with no whitelist:
```
const overrideEntries = Object.entries(trait_overrides) as [keyof PersonalityBase, number][];
for (const [key, value] of overrideEntries) {
  if (typeof value === 'number') {
    (personality as unknown as Record<string, number>)[key] = clamp(value);
  }
}
```
Any key with a numeric value — not just the 6 valid ones — got written
straight into `personality`, which is then stored verbatim in the
`personality_base` JSONB column, polluting it with fields the rest of the
app never expects there. Separately, `trait_overrides: null` (a valid JSON
value, distinct from the field being omitted, which is what the
destructuring default `= {}` actually guards against) would make
`Object.entries(null)` throw, surfacing only as an opaque 500 via the
route's generic catch block — a robustness gap, not a security hole, but
worth closing with the same fix.

While walking the rest of §8, re-verified the specific routes the checklist
names as backlog candidates and found all already have solid ad-hoc
validation matching the checklist's own asks: `/api/job-description` caps
`rawText` at 50k chars (explicit reject, not silent truncation) and
`sourceUrl` at 2k; `/api/negotiate/create` bounds both amounts to
`(0, 1_000_000]` with `Number.isFinite` checks and `experience_years` to
`[0, 60]`; `/api/interviewer/create` clamps all personality sliders via the
same `clamp()` pattern and validates every enum field
(`interview_type`, `archetype`, `company_style`, `communication_style`,
`voice_id`) against a whitelist before use. Also confirmed
`/api/interview/create`'s `difficulty` (integer 1–10), `archetype_mix`
(array, max 2, each key checked against `INTERVIEWER_ARCHETYPES`), and
`constraints` (array, max 10 × 200 chars) are already validated — only
`trait_overrides` had the gap. `session_length` and `interview_type` are
native Postgres ENUM types (`supabase/migrations/20250214000000_session_length.sql`,
`20250121000000_initial_schema.sql`), so an invalid value can never be
persisted even though the route doesn't pre-validate it with a friendly
400 — worst case is a generic 500 from the existing catch-all, not data
corruption; not treated as a failure. Also confirmed the one existing Zod
consumer (`app/api/webhooks/route.ts`) already returns
`validation.error.flatten().fieldErrors` on failure — the structured,
non-leaking shape the checklist asks for, not the raw Zod error tree.

**Tools/commands run:**
- `npx tsc --noEmit -p tsconfig.json` (full project) — exit 0, no errors.
- `npx next lint --file app/api/interview/create/route.ts` — "No ESLint
  warnings or errors."
- `npx next lint --file tests/app/api/interview/create-trait-overrides.test.ts`
  — "No ESLint warnings or errors" (after removing an unused mock
  parameter that first tripped `@typescript-eslint/no-unused-vars`, and
  fixing a TS2556 spread-into-zero-arg-mock error caught by `tsc`).
- New test `tests/app/api/interview/create-trait-overrides.test.ts` (4
  tests, `// @vitest-environment node`): mocks `@/lib/supabase/server` and
  `@/lib/ai/backstory-generator`. Asserts an unknown key is rejected with
  400 before any DB/AI call is made, `null` and array payloads are
  rejected with 400 instead of crashing, and a payload with only
  whitelisted keys proceeds past this specific check (fails later at a
  deliberately-mocked interviewer-insert error, proving it wasn't blocked
  by the new validation).
- `npx vitest run` (full suite) — 10 files, 44/44 passing (up from 40/40
  before this fix; +4 new tests).

**Result:** `trait_overrides` can no longer inject arbitrary keys into the
stored `personality_base` JSONB, and a `null`/array payload now returns a
clean 400 instead of an unhandled exception.

**Known limitations:**
- The checklist's broader §8 ask ("add Zod schemas to every route that
  parses a JSON body") remains a backlog item, not fixed — the checklist
  itself frames this as "the backlog item," and every route checked this
  session already has adequate ad-hoc validation covering the specific
  concerns raised (see above), so there is no concrete exploitable gap
  driving a wholesale Zod migration right now. Worth doing eventually for
  consistency/maintainability, not because current routes are unsafe.
  Consistent with `underfireai-blueprint-v1.md` §12.1's existing "Zod
  validation gap" open issue.
- Query-string validation for list endpoints (`/api/webhooks`,
  `/api/interview/recap`) was not walked this session.
- Continuing top-down. §9–§12 not yet re-verified this session.

### 2026-07-13 — §9 Rate Limiting: fully implemented in code, but inert in production

**What:** No code change. Verified that `lib/rate-limit.ts`'s Upstash-backed
sliding-window rate limiter is soundly implemented (per-route policies for
tts, stt, codeRun, codeSubmit, resumeUpload, chat, coaching, analyze,
jdParse, webhookTest all match the checklist's recommended ceilings), but
confirmed with Chris that `RATE_LIMIT_ENABLED` and `UPSTASH_REDIS_URL` /
`UPSTASH_REDIS_TOKEN` are **not set in the live Vercel production
environment**. Per `checkRateLimit()`'s own logic, this means every single
rate-limited endpoint currently has **zero abuse protection in production**
right now — exactly the risk the checklist calls "the biggest open risk"
for this section.

**Why not fixed with a code change:** the implementation is already
correct and complete; the gap is purely a missing external
service/environment configuration (an Upstash Redis database + three env
vars in Vercel), not a code bug. Chris confirmed he'll provision Upstash
and set the env vars himself (`RATE_LIMIT_ENABLED=true`,
`UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN` — exact names already documented
in `.env.example` and the header comment of `lib/rate-limit.ts`). Offered a
Postgres-based stopgap limiter as an alternative that wouldn't require a
new SaaS signup; Chris chose to set up Upstash directly instead.

**Exposure while this remains unset:** any authenticated user can currently
loop Judge0 code execution (pay-per-submission via RapidAPI), Cartesia/
OpenAI TTS, Mistral resume-vulnerability scans, Mistral coaching/analysis
calls, and DeepSeek JD parsing with no per-minute/per-hour ceiling. The
webhook test endpoint (`/api/webhooks/[webhookId]/test`) can be looped to
fire requests at an arbitrary user-supplied URL — usable as a DDoS
reflector against a third party using UnderFireAI's own server as the
origin.

**Tools/commands run:** none — no code changed. Verified by reading
`lib/rate-limit.ts` in full and confirming with Chris directly that the
Vercel env vars are unset (cannot be checked from this sandbox).

**Result:** No production change yet. Documented as an open, live,
confirmed gap.

**Known limitations:**
- This is a live, currently-active abuse-cost exposure until Chris
  completes the Upstash setup and confirms the env vars are live in
  Vercel. Recorded in `underfireai-blueprint-v1.md` §12.1 alongside the
  timezone and httpOnly backlog items.
- Not yet re-verified: the remaining §9 items requiring Supabase Dashboard
  access (Auth's built-in signup/password-reset rate limits) — cannot be
  checked from this sandbox either.

### 2026-07-13 — §10 CORS/Headers: domain not actually on the HSTS preload list

**What:** No code change. Verified `next.config.ts`'s CSP and security headers
line-by-line against §10 and found everything else already correct:
`script-src`'s `unsafe-inline`/`unsafe-eval` is an acknowledged, non-failure
tradeoff (Next/React/GSAP/Three requirement); `connect-src` correctly omits
any TTS-provider origin because `lib/tts/openai-tts.ts` calls
`api.openai.com` server-side only (the browser only ever talks to our own
`/api/tts`, matching the existing Judge0 pattern); `img-src` still needs
`images.unsplash.com` (confirmed still referenced in `app/page.tsx`);
`frame-src`/`frame-ancestors 'none'`, `form-action 'self'`,
`Referrer-Policy`, `X-Frame-Options`/`X-Content-Type-Options`,
`poweredByHeader: false`, and COOP/CORP same-origin are all present and
correct; `Permissions-Policy` already has `microphone=(self)` (needed for
the mobile STT `getUserMedia`/`MediaRecorder` flow in
`/api/interview/[sessionId]/transcribe`) with `camera=()` still denied —
already updated for STT, contrary to the checklist's assumption that this
was still a future concern. Grepped the whole repo for
`Access-Control-Allow-Origin` — no route sets a wildcard or any manual CORS
header (Next.js API routes are same-origin only by default, as desired).
The waitlist Edge Function the checklist names
(`supabase/functions/waitlist-signup/index.ts`) no longer exists at all —
the whole feature was already dropped (matches the DB migration
`20260424000002` that dropped the waitlist table), so its CORS check is
moot.

**The one real, verified gap:** the `Strict-Transport-Security` header
correctly includes `preload`, but querying the actual HSTS Preload List API
confirms `underfireai.com` has never been submitted:
```
GET https://hstspreload.org/api/v2/status?domain=underfireai.com
→ { "name": "underfireai.com", "status": "unknown", "bulk": false, "preloadedDomain": "" }
```
Sending the `preload` directive in the header is necessary but not
sufficient — browsers only actually enforce HSTS-on-first-visit for
domains baked into their shipped preload list via a one-time manual
submission at hstspreload.org, which has not happened. Existing/repeat
visitors are unaffected (the header itself already forces HTTPS on every
response after their first visit), so this is a narrower gap than the
`RATE_LIMIT_ENABLED` finding — it only affects a user's very first-ever
connection to the domain before any HTTPS response has been received.

**Why not fixed with a code change:** submission is a manual, one-time
action on hstspreload.org (visit the site, confirm eligibility, click
submit) — there is no API for actually submitting, only for checking
status, and it's tied to Chris's ownership of the domain rather than
anything in this repo.

**Tools/commands run:**
- `grep -rn "Access-Control-Allow-Origin"` across the repo — no matches in
  application code.
- Live check: `GET https://hstspreload.org/api/v2/status?domain=underfireai.com`
  — confirmed not submitted (`status: "unknown"`).

**Result:** No code change. Documented as an open, low-severity action item.

**Known limitations:**
- Cannot verify the live production server is actually serving the
  `Strict-Transport-Security` header as configured (would need a raw HTTP
  HEAD request against the deployed site, not just the `next.config.ts`
  source) — the fetch tool available in this session only surfaces parsed
  page metadata, not raw response headers.
- Continuing top-down. §11–§12 not yet re-verified this session.

### 2026-07-13 — §11 Dead Code Sweep: removed 12 confirmed-unused components

**What:** Deleted 12 component files (~4,300 lines) and trimmed/removed their
barrel `index.ts` re-exports:
- `components/animation/animated-background.tsx`, `animated-components.tsx`
- `components/gamification/score-chart.tsx`, `streak-display.tsx`
- `components/interview/feedback-panel.tsx`, `score-card.tsx`, `timer-display.tsx`
- `components/interviewer/BackgroundGenerator.tsx`, `InterviewerCard.tsx`, `PersonalityConfig.tsx`
- `components/profile/skills-editor.tsx` (and the now-empty `components/profile/` directory)
- `components/resume/resume-preview.tsx`

`components/interviewer/index.ts` and `components/profile/index.ts` were
deleted outright since removing their contents left them fully empty with
zero remaining exports and nothing importing the bare barrel path.
`components/animation/index.ts`, `components/gamification/index.ts`,
`components/interview/index.ts`, and `components/resume/index.ts` were
rewritten to drop only the dead re-export lines, keeping every export that
is genuinely still used (`gsap-provider`, `badge-grid`,
`InterviewSetupForm`/`InterviewChat`/etc., `ResumeUploadForm`/etc.).

**Why:** First verified the checklist's 5 "Known dead or deprecated" items
were already resolved in prior sessions (`reset_monthly_interviews`,
`use_interview_credit` RPC, legacy Stripe subscription handlers,
`RATE_LIMITS` object in `lib/ai/config.ts`, and the `'premium'` enum value
— all either already dropped via migration or never actually referenced in
any runtime code path; confirmed via grep, not assumption). The "suspected
dead" component sweep is where the real finding was. A cross-reference
script comparing every component export name against the rest of the
codebase (excluding each component's own barrel re-export line) found ~15
exports across ~10 files with zero real usage. Manually re-verified every
"used" hit from the first pass to rule out false positives from generic
name collisions (several files define their own unrelated local
`ScoreCard`/`ScoreRing`/`ScoreBadge`/`ScoreTrend` helpers, and
`coding-challenge.tsx`'s "Reveal Hint" button text isn't an import of the
`Reveal` animation component) — after correcting for those, the real dead
list grew to 12 files / ~35 exports. Confirmed the root cause with git
history and a direct code read: every one of these files dates to the
literal `Initial commit` (2026-01-28), and the pages that would consume
them were built afterward with bespoke inline markup instead (confirmed
concretely for both `InterviewerCard` — `app/(dashboard)/interviewers/page.tsx`
hand-writes its own card JSX — and the `gamification/` components —
`app/(dashboard)/progress/page.tsx` computes its own streak/score values
and renders them through generic stat-card primitives instead of importing
`StreakDisplay`/`ScoreChart`). Reviewed the full list with Chris before
deleting anything, given the scope was much larger than a typical
single-fix change this session.

**Tools/commands run:**
- `npx depcheck` — confirmed zero unused npm dependencies (the checklist's
  three named suspects — `@react-three/fiber`, `lenis`, `date-fns` — are
  all genuinely in use).
- `npx knip` — attempted, crashed on an out-of-memory error in this sandbox
  (`RangeError: Array buffer allocation failed`), unrelated to the repo;
  fell back to a custom cross-reference script instead.
- `npx tsc --noEmit -p tsconfig.json` (full project, after deletion) — exit
  0, no errors.
- `npx next lint` (full project, no `--file` filter) — "No ESLint warnings
  or errors."
- `npx vitest run` (full suite) — 10 files, 44/44 passing, unchanged from
  before the cleanup (no test referenced any of the deleted files).
- `npx next build` — did not complete in this sandbox; fails immediately
  on `next/font/google` trying to fetch Inter from
  `fonts.googleapis.com`, which this sandbox has no network access to.
  This is a pre-existing sandbox limitation unrelated to this change (the
  fetch failure happens before any bundling of application code), not a
  regression — could not be verified end-to-end as a full production
  build in this session.

**Result:** ~4,300 lines of dead component code removed; every remaining
barrel export is confirmed genuinely used somewhere in the app.

**Known limitations:**
- Could not run a full `next build` in this sandbox (network-restricted,
  unrelated to the change). Recommend Chris runs `npm run build` locally
  or watches the next Vercel deploy closely as the final confirmation,
  though `tsc`/lint/tests passing clean gives high confidence.
- Did not exhaustively check the remaining §11 "suspected dead" items this
  session: unused `app/api/**` routes not called by any client/server
  code, and the (now-resolved, per earlier verification) `account` vs
  `settings` route question. `app/(dashboard)/account/` was confirmed to
  no longer exist at all (only `/settings` and the unrelated
  `/api/account/delete` route remain) — the checklist's own text was
  stale on this point.

### 2026-07-13 — §12 Sensitive Data in Logs: full pass, no findings

**What:** No code change. Walked every named hotspot in §12 against current
code:
- `app/api/stripe/webhook/route.ts` — every log line references only IDs
  (`session.id`, `paymentIntent.id`, `charge.id`, `userId`, `product`,
  dispute reason/status/amount) or a caught error's `.message`; grepped for
  full-object dump patterns (`console.log(session)`, `console.log(body)`,
  etc.) across the whole route with zero matches. No email, card data, or
  full Stripe object ever logged.
- `app/api/resume/upload/route.ts` — all `console.error`/`console.warn`
  calls log caught `Error` objects or a Mammoth conversion-messages array
  (structural docx warnings, not document content); `file.name` and parsed
  resume text are never logged.
- `lib/ai/chat-client.ts` — the only 3 `console.*` calls in the file are in
  a resume/JD analysis retry helper and log `error.message` only; the main
  `createChatCompletion()` path (which sends the full interview transcript
  + system prompt to OpenRouter) has zero logging of the request/response
  body.
- `lib/tts/openai-tts.ts` (current TTS provider, supersedes the checklist's
  `cartesia-tts.ts` reference) — logs only a voice-key fallback notice and
  HTTP status codes; TTS input text is never logged.
- `lib/webhooks/webhook-service.ts` — grepped for every use of `secret`;
  confirmed it's only ever passed as an HMAC key parameter, never
  interpolated into a log line.
- API keys: grepped for every secret env var name appearing inside a
  `console.*` call — the only 2 hits (`app/api/tts/route.ts`,
  `.../transcribe/route.ts`) log the fixed diagnostic string
  `"OPENAI_API_KEY not configured"` / `"OPENROUTER_API_KEY not configured"`
  — the env var *name*, never its value.
- Bearer tokens: grepped for every `Authorization: Bearer ${apiKey}`
  construction (4 files) and confirmed none of them are also passed to a
  `console.*` call anywhere (also grepped for any `console.*` logging a
  `headers` object at all — zero matches).
- `app/error.tsx` and `app/(dashboard)/error.tsx` — both render only
  `error.digest` (Next.js's intentionally-opaque, safe-to-display
  reference id) in a small "Error ID"/"Reference" line; neither renders
  `error.message` or `error.stack` to the user. The `console.error(...,
  error)` calls run client-side in a `useEffect` — for server-originated
  errors, Next.js has already redacted `error` to `{message, digest}` by
  the time it reaches a client error boundary in production, so nothing
  sensitive is newly exposed by also logging it to the browser console;
  for client-originated errors, the browser already has the full error
  regardless.
- One initially-suspicious grep hit
  (`lib/code-execution/language-wrappers.ts` — `console.log(JSON.stringify(...))`)
  turned out to be a string template for the wrapper code sent to Judge0's
  sandboxed runtime — it executes inside the candidate's remote code
  execution, never on our own server, so it's out of scope for this
  section entirely (nothing to do with Vercel's own logs).

**Result:** No findings. Every named §12 hotspot, plus a broader grep for
full-object-dump patterns across all 199 `console.*` calls in `app/` and
`lib/`, came back clean.

**Known limitations:** did not manually read all 199 `console.*` call
sites individually — relied on targeted regex passes for the specific risk
patterns the checklist calls out (secret env vars, Authorization headers,
full request/session/body object dumps) plus a full read of every named
hotspot file. A residual, low-probability chance remains that some
call site outside those patterns logs something sensitive in a way this
sweep didn't anticipate.

---

**This closes out the full top-to-bottom walk of `underfireai-audit-checklist-v1.md`
v1 for this session.** Summary of the pass: 7 concrete code fixes shipped
(§2 resume-scan dedupe + anti-coaching prompts, §4 webhook RLS admin-client
fix, §5 middleware fail-closed, §6 upload Content-Length limit, §7 explicit
Secure/SameSite cookies, §8 trait_overrides whitelist), one major live
production gap identified and handed to Chris to close externally (§9 rate
limiting never enabled — no code fix needed, implementation was already
correct), one minor external action item (§10 HSTS preload submission),
one substantial cleanup (§11: 12 dead component files removed, ~4,300
lines), two items explicitly deferred to a future session per Chris's
own call (timezone streak logic, §7 httpOnly), and two sections (§1, §12)
came back as full clean passes on re-verification. See
`project_audit_progress.md` memory for the full narrative and
`underfireai-blueprint-v1.md` §12.1 for the standing Open Issues list.
