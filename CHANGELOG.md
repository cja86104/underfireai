# Changelog

All notable changes to UnderFireAI are recorded here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Entries before
this file existed (2026-06-22) are not backfilled — see `git log` for that
history, which has carried detailed commit messages since 2026-05-31.

## [Unreleased]

### Added
- CI pipeline (GitHub Actions) running typecheck, lint, and unit tests on
  every push/PR to `main`.
- `WORKLOG.md` — session-level development log.
- This file.
- `README.md`.
- `LICENSE` — explicit all-rights-reserved proprietary notice.

### Changed
- `CLAUDE.md` now requires every work session to update `WORKLOG.md`, and to
  fold notable changes into this file.
- Landing page (`app/page.tsx`) mobile UX: replaced the overflowing top
  nav with a hamburger menu (`<md`) containing all section links + Sign
  in + Get Started Free; tightened mobile vertical section padding so
  the page is ~670px shorter on mobile; added a sticky mobile-only
  Get Started Free bar pinned to the viewport bottom. Desktop layout
  (`md+`) is unchanged.
