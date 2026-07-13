# Changelog

All notable changes to UnderFireAI are recorded here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Entries before
this file existed (2026-06-22) are not backfilled — see `git log` for that
history, which has carried detailed commit messages since 2026-05-31.

## [Unreleased]

### Added
- SHA-256 `file_hash` column on `user_resumes` (migration
  `20260713000000_add_resume_file_hash.sql`), used to dedupe repeated
  resume uploads.
- CI pipeline (GitHub Actions) running typecheck, lint, and unit tests on
  every push/PR to `main`.
- `WORKLOG.md` — session-level development log.
- This file.
- `README.md`.
- `LICENSE` — explicit all-rights-reserved proprietary notice.

### Fixed
- Auth middleware (`lib/supabase/middleware.ts`) now fails closed if
  Supabase itself is unreachable — previously an unhandled rejection
  from `auth.getUser()` would have surfaced as a middleware error on
  nearly every route (public pages included) during a Supabase outage.
  Now treats the request as unauthenticated, so protected routes bounce
  to `/login` and public routes keep rendering (audit checklist §5
  finding).
- Outbound webhook delivery (`session.completed` events and the manual
  "Send test webhook" button) was silently sending zero real HTTP
  requests — `webhook_deliveries` INSERT/UPDATE were going through the
  RLS-scoped client, which has no write policy on that table, so every
  write was rejected and the actual delivery call was never reached.
  Now uses the service-role admin client for those writes (audit
  checklist §4 finding).
- Live interview system prompt (single-interviewer and panel mode) now
  explicitly forbids the interviewer from coaching the candidate
  (answering on their behalf, supplying model answers, rewriting their
  response). Technical/coding sessions additionally forbid the
  interviewer from writing, dictating, or fixing the candidate's code
  (audit checklist §2 content-safety finding).
- Resume upload no longer pays for a fresh Mistral vulnerability scan on
  every re-upload of byte-identical content — `generateAndSaveVulnerabilityScan`
  now reuses a same-hash scan from the last 24h when the upload route
  supplies a `file_hash` (audit checklist §2 cost-leak finding). The
  manual `/api/resume/scan-vulnerabilities` endpoint, including its
  `forceRescan` option, is unaffected.
- Resume upload route (`app/api/resume/upload/route.ts`) now rejects
  requests over 8MB by `Content-Length` before `request.formData()` reads
  the body, closing a gap where an oversized multipart body would be fully
  buffered into memory before the existing 5MB `file.size` check could
  reject it — `next.config.ts`'s `serverActions.bodySizeLimit` does not
  apply to Route Handlers (audit checklist §6 finding).
- Supabase auth cookies (`lib/supabase/server.ts`, `lib/supabase/middleware.ts`,
  `lib/client.ts`) now explicitly set `Secure` in production — previously
  relied entirely on `@supabase/ssr`'s own defaults, which include no
  `Secure` flag at all, so the session cookie could legally be sent over
  plain HTTP (audit checklist §7 finding).

### Changed
- `CLAUDE.md` now requires every work session to update `WORKLOG.md`, and to
  fold notable changes into this file.
- Landing page (`app/page.tsx`) mobile UX: replaced the overflowing top
  nav with a hamburger menu (`<md`) containing all section links + Sign
  in + Get Started Free; tightened mobile vertical section padding so
  the page is ~670px shorter on mobile; added a sticky mobile-only
  Get Started Free bar pinned to the viewport bottom. Desktop layout
  (`md+`) is unchanged.
- Landing page hero (`app/page.tsx`) headline changed to "Master Your
  Interviews" / "WE PUT YOU UNDER FIRE FIRST" (previously "Train Under
  Fire." / "So the real thing feels easy."); added a desaturated,
  scrimmed background photo behind the hero content. `e2e/landing.spec.ts`
  updated to match the new headline.
- Hero background photo brightened (opacity 0.22 -> 0.44, lighter scrim)
  and the "Hero card" mock chat/analysis panel removed entirely so the
  background photo is fully visible; hero content is now a single
  centered column instead of a two-column grid.
