# UnderFireAI

**Train under fire, so the real thing feels easy.**

UnderFireAI is an AI-powered interview coaching platform. Instead of a generic
chatbot, each AI interviewer has a hidden personality (skeptical, friendly,
detail-obsessed, rapid-fire, and more) that comes out through the
conversation — the same way a real interviewer's style does. It drills
candidates under realistic pressure across multiple interview formats, scores
their answers, and targets questions at the specific gaps in their resume or
a pasted job description.

[![CI](https://github.com/cja86104/underfireai/actions/workflows/ci.yml/badge.svg)](https://github.com/cja86104/underfireai/actions/workflows/ci.yml)

## Features

- **Hidden-personality AI interviewers** — 8 archetypes (skeptic, griller, friendly, silent judge, rapid-fire, culture-fit, technical expert, executive), each with its own question style and difficulty modifier.
- **6 interview formats** — behavioral, technical (with live coding), case, HR, panel (multiple interviewers in one session), and phone screen.
- **Voice mode** — streaming text-to-speech and speech-to-text for a real spoken back-and-forth instead of typing.
- **Live coding challenges** — sandboxed code execution (Judge0) across multiple languages for technical interviews.
- **STAR-method scoring** — per-answer breakdown of clarity, confidence, relevance, depth, STAR usage, and communication.
- **Resume tools** — upload parsing (PDF/DOCX), a vulnerability scanner that flags gaps an interviewer would probe, and a job-description gap analyzer.
- **Resume-targeted interviews** — the interviewer deliberately drills into a candidate's weak spots and JD gaps.
- **Salary negotiation simulator** — practice against an AI recruiter that pushes back, scored on confidence, framing, and strategy.
- **Custom interviewers** — build a personality, voice, and set of pet peeves rather than using a preset archetype.
- **Gamification** — streaks, badges, and progress tracking across sessions.
- **Outbound webhooks** — signed `session.completed` notifications for downstream integrations.
- **One-time credit packs, no subscriptions** — credits don't expire.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript (strict) |
| Database / Auth | Supabase (Postgres with row-level security on every table) |
| Payments | Stripe — one-time payments, idempotent webhook handling |
| AI chat / scoring | OpenRouter (DeepSeek for interviews, Mistral for analysis, Claude Haiku as fallback) |
| Text-to-speech | OpenAI TTS (streaming) |
| Speech-to-text | OpenRouter / Groq Whisper |
| Code execution | Judge0 (sandboxed, multi-language) |
| Rate limiting | Upstash Redis, sliding-window, feature-flagged |
| Styling | Tailwind CSS |
| 3D / animation | Three.js, React Three Fiber, GSAP, Lenis |
| State / data | Zustand, TanStack Query |
| Testing | Vitest (unit), Playwright (E2E) |
| Hosting | Vercel |

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project (Postgres + Auth)
- API keys for the services listed below

### Install

```bash
npm install
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in real values. At minimum you'll need:

```
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENROUTER_API_KEY
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_STARTER_PRICE_ID
STRIPE_PRO_PACK_PRICE_ID
STRIPE_REFILL_PRICE_ID
```

Rate limiting is optional and off by default — set `RATE_LIMIT_ENABLED=true`
plus `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` to turn it on. See
`.env.example` for the full list and inline notes.

### Database

```bash
npx supabase db push     # apply migrations in supabase/migrations
npm run db:generate       # regenerate types/database.ts from the live schema
```

### Run

```bash
npm run dev
```

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint via `next lint` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run db:generate` | Regenerate Supabase types |
| `npm run db:migrate` | Push DB migrations |
| `npm run db:reset` | Reset the local DB |

## Testing

- **Unit tests** (`tests/`, Vitest) cover the interviewer-response sanitizer
  and a voice-mode UI regression. Coverage is intentionally narrow today —
  it protects the highest-risk logic first, not the whole codebase.
- **E2E** (`e2e/`, Playwright) currently covers a landing-page smoke test.
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, and unit tests on
  every push/PR to `main`. E2E is not yet wired into CI — it boots a real
  dev server against live third-party services and needs a dedicated
  staging environment first.

## Project structure

```
app/                  Next.js App Router pages and API routes
  (auth)/             Login, register, password reset
  (dashboard)/        Authenticated app pages
  api/                Server routes (interview, resume, stripe, webhooks, ...)
components/           React components, grouped by feature area
lib/                  Business logic: AI clients, TTS/STT, scoring, resume
                      parsing, rate limiting, webhooks
supabase/migrations/  Postgres schema, RLS policies, and SQL functions
types/                Shared TypeScript types, including generated DB types
tests/ e2e/           Vitest unit tests and Playwright E2E tests
```

## Project documents

- `underfireai-blueprint-v1.md` — full product/architecture spec.
- `underfireai-audit-checklist-v1.md` — standing verification checklist.
- `WORKLOG.md` — session-by-session development log.
- `CHANGELOG.md` — notable changes, Keep a Changelog format.
