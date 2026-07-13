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
- Resume upload no longer pays for a fresh Mistral vulnerability scan on
  every re-upload of byte-identical content — `generateAndSaveVulnerabilityScan`
  now reuses a same-hash scan from the last 24h when the upload route
  supplies a `file_hash` (audit checklist §2 cost-leak finding). The
  manual `/api/resume/scan-vulnerabilities` endpoint, including its
  `forceRescan` option, is unaffected.

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
