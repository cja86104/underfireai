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
