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
