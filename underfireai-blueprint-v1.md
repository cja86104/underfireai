# UnderFireAI

## Master Blueprint

***"Train Under Fire. So the real thing feels easy."***

Version 1.0  |  April 2026

Owner: Allen Code Co (Chris Allen)

Domain: underfireai.com

Production Standards: Allen Code Standards v1

*This document is the complete source of truth for UnderFireAI. It contains every product decision, architecture spec, database schema, feature definition, business model detail, AI provider decision, and every known product issue. Give this document to any AI assistant starting or continuing work on this project. It is fully self-contained. No prior conversation context is needed.*

---

## 0. AI Assistant Instructions

**Read this section completely before writing any code, creating any files, or making any decisions about this project.**

### 0.1 What This Project Is

- UnderFireAI is a standalone AI-powered interview coaching platform.
- It is NOT connected to, forked from, or sharing code with any other Allen Code Co project.
- Build from the specifications in this document only.
- **This is a live production SaaS application.** Every change must be deploy-ready.

### 0.2 AI Provider Rule — CRITICAL

**NEVER use the Anthropic / Claude API directly in this project. It is too expensive for production at scale.**

All AI-powered features use OpenRouter with a tiered model strategy:

```
Provider:     OpenRouter
Base URL:     https://openrouter.ai/api/v1
API Key:      OPENROUTER_API_KEY
SDK:          Direct fetch (see lib/ai/chat-client.ts)

Primary model (interview conversations):
  deepseek/deepseek-chat  (DeepSeek V3)
  ~$0.00027 / 1K tokens

Analysis model (scoring, coaching, vulnerability scan):
  mistralai/mistral-small-3.1-24b-instruct
  Different provider from DeepSeek to avoid rate-limit contention on parallel calls.

Fallback model (only when the above fail):
  anthropic/claude-3-haiku-20240307
  Routed via OpenRouter, NOT via the direct Anthropic SDK.

Resume parsing:
  deepseek/deepseek-chat
```

UI label when surfacing AI: generic ("AI-powered") — never mention DeepSeek, Mistral, Claude, or OpenAI to end users in the product copy.

### 0.3 Code Standards (Allen Code Standards v1)

- TypeScript strict mode. Zero `any`. Zero `eslint-disable` comments.
- Zero `@ts-ignore`, `as any`, `ignoreBuildErrors: true`, or any error suppression. **Errors are fixed at root cause, never muted.**
- Every API route authenticates the user with `getCurrentUser()` before any DB or business logic.
- Service role client (`createClient(url, SUPABASE_SERVICE_ROLE_KEY)`) is used ONLY in webhooks, cron jobs, and admin operations. Never in client components or standard API routes.
- Full file delivery only — never snippets or diffs. Work in named sections with stops between each.
- No placeholder values, mock data, fake examples, or `TODO` comments in delivered code.
- Errors surface — no silent swallowing. Every error path logs and returns a structured JSON error.
- Never delete fields from a DB insert to resolve a type error. Add the missing migration instead.
- Accent colour: `#f97316` (Tailwind orange-500). Dark-first UI against `#0a0a0a` / `#18181b`.

### 0.4 Tech Stack Summary

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15.1 (App Router) | React 19, TypeScript strict |
| Database | Supabase (PostgreSQL) | Project ID: `nodkmtwchiivlwjktzis`, RLS on every table |
| Auth | Supabase Auth | Email / password + OAuth callback route |
| Styling | Tailwind CSS 3.4 | Dark-first, `#f97316` accent |
| Payments | Stripe (one-time payments only) | NO subscriptions — credit-pack model |
| AI Chat | OpenRouter → DeepSeek V3 | Primary interview model |
| AI Analysis | OpenRouter → Mistral Small 3.1 24B | Scoring, coaching, vuln scan |
| AI Fallback | OpenRouter → Claude Haiku 3 | Reliability fallback only |
| TTS | Cartesia Sonic 3 | Streaming, 40ms TTFA |
| Code Execution | Judge0 via RapidAPI | 7 languages, sandboxed Docker |
| Resume Parsing | `pdf-parse` + `mammoth` | PDF + DOCX input |
| Animation | GSAP, Three.js, Lenis | Landing page + HUD |
| Charts | Recharts | Progress page analytics |
| State | Zustand + TanStack Query | Client state + server cache |
| Hosting | Vercel | Edge-ready, Vercel Analytics |
| Email | Hostinger SMTP (via Supabase Edge Function) | Waitlist confirmations |

---

## 1. Product Vision & Overview

### 1.1 Elevator Pitch

UnderFireAI is a purpose-built AI interview coach that forces you to actually think. Every AI interviewer has a hidden personality — skeptical, friendly, detail-obsessed, big-picture — that you discover through the conversation, just like a real interview. It drills you under pressure with voice mode, STAR-method scoring, coding challenges, panel interviews, salary-negotiation simulations, and resume-targeted questions, so that when you walk into the real thing it feels easy.

### 1.2 The Core Problem

- Candidates rehearse canned answers. Real interviews punish that.
- Generic chatbots don't have the pressure of a real interviewer with opinions, mood, and follow-up questions.
- Interview prep tools charge monthly subscriptions for something people only need for a few weeks at a time.
- No existing tool targets your specific resume weak-spots or the gaps between your profile and a specific job description.

### 1.3 The Solution

- **Hidden-personality AI interviewers** — each with a unique backstory, mood, and question style.
- **6 interview types** — behavioural, technical (with live coding), case, HR, panel, phone screen.
- **Voice mode** — Cartesia Sonic 3 streaming TTS for natural conversational flow.
- **STAR-method scoring** — real-time breakdown of clarity, confidence, technical depth, STAR usage, communication.
- **Resume vulnerability scanner** — analyses uploaded resumes for gaps and exposed areas an interviewer would probe.
- **JD gap analyzer** — compares your resume against a specific job description and surfaces missing skills.
- **Resume-targeted interviews** — the AI interviewer deliberately drills into your weak spots and JD gaps.
- **Custom interviewer creator** — build your own AI interviewer with custom personality, voice, and pet peeves.
- **Custom scenario builder** — blend two archetypes, add constraints, override personality traits.
- **Salary negotiation simulator** — practice negotiating against an AI recruiter who pushes back, scored on confidence/framing/strategy.
- **Panel interviews** — multiple interviewers in one session, each with their own impression tracker.
- **Outbound webhooks** — `session.completed` notifications with HMAC signing for enterprise / ATS integrations.
- **One-time payments, no subscriptions** — credits never expire.

### 1.4 What UnderFireAI Is NOT

- Not a generic chatbot wrapper.
- Not a subscription SaaS — there is no recurring billing.
- Not a resume builder — it analyses resumes but does not generate or rewrite them beyond suggestion text.
- Not a job board — no JD discovery, only pasted-in JD analysis.
- Not an ATS integration platform — webhooks are one-directional, outbound only.

---

## 2. Business Model & Pricing

### 2.1 One-Time Interview Credit Packs (no subscriptions)

| Pack | Price | Interviews | Per-Interview | Notes |
|---|---|---|---|---|
| Starter Pack | $25 | 6 | ~$4.17 | `starter_6` — entry point |
| Pro Pack | $35 | 11 | ~$3.18 | `pro_11` — best value, most popular |
| Refill Pack | $10 | +5 | $2.00 | `refill_5` — only for users who already purchased |

Every feature is unlocked the moment a user completes any purchase. Credits never expire.

### 2.2 Refill Pack Rule

Refill Pack (`refill_5`) is only visible and purchasable to users with `profiles.purchased_interviews > 0`. `POST /api/stripe/create-checkout` enforces this server-side — a direct POST with `{ product: 'refill_5' }` from a first-time user returns a 400.

### 2.3 Credit Accounting

- `profiles.purchased_interviews` — lifetime accumulator of credits granted. Only written by the `grant_interview_credits` RPC from the Stripe webhook.
- `profiles.interviews_used` — lifetime accumulator of credits spent. Incremented atomically in `/api/interview/create` via an optimistic-lock update.
- `availableInterviews = max(0, purchased_interviews - interviews_used)`.
- `hasPurchased = purchased_interviews > 0`. All premium features key off this single boolean.
- `subscription_tier` remains in the schema for legacy reasons — `'free'` (never purchased) or `'pro'` (has purchased). `'premium'` is deprecated but still accepted as a legacy value.

### 2.4 Idempotency & Race Prevention

- Stripe fires both `checkout.session.completed` AND `payment_intent.succeeded` for the same payment. Both handlers call `grant_interview_credits` which uses INSERT-first on `interview_purchases` with a UNIQUE constraint on `(stripe_payment_intent_id)` and `(stripe_checkout_session_id)` — only one event wins.
- `/api/interview/create` uses an optimistic lock: `UPDATE profiles SET interviews_used = N+1 WHERE id = X AND interviews_used = N`. Concurrent creates get a 409.
- On session-INSERT failure after credit consumed, `decrement_interviews_used` RPC runs a relative decrement (clamped at 0) so a concurrent successful create isn't clobbered.

### 2.5 Revenue Projections (rough)

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Paying users / month | 80 | 300 | 900 |
| Avg revenue / paying user | $28 | $30 | $32 |
| Monthly revenue | $2,240 | $9,000 | $28,800 |
| Refill attach rate (est.) | 10% | 15% | 20% |

### 2.6 Cost Controls

- DeepSeek + Mistral per-interview token spend averages <$0.02. Gross margin on Starter is ~98%.
- Cartesia TTS: ~$0.038 / 1,000 characters. A full voice-mode interview runs ~$0.30 in TTS cost.
- Judge0 (code exec): pay-per-submission via RapidAPI, negligible at current volume.
- Session length is capped in DB — `short` = 10 user messages, `standard` = 20, `deep` = 30. Prevents runaway token spend on a single session.

---

## 3. Feature Specification

### 3.1 Interview Types (6)

| Type | Slug | Questions | Follow-up Prob | STAR Focus | Time/Q (sec) |
|---|---|---|---|---|---|
| Behavioural | `behavioral` | 5–8 | 70% | Yes | 180 |
| Technical | `technical` | 4–6 | 80% | No | 300 |
| Case | `case` | 2–4 | 90% | No | 600 |
| HR | `hr` | 6–10 | 50% | No | 120 |
| Panel | `panel` | 6–10 | 60% | Yes | 180 |
| Phone Screen | `phone_screen` | 4–6 | 40% | No | 120 |

Values are authoritative in `lib/ai/config.ts → INTERVIEW_CONFIGS`.

### 3.2 Interviewer Archetypes (8)

Defined in `types/interviewer.ts → INTERVIEWER_ARCHETYPES`. Each archetype has a base personality, communication style, question patterns, red/green flags, pet peeves, favourite topics, suggested Cartesia voices, and a difficulty modifier.

- `skeptic` — challenges every claim, asks for proof.
- `griller` — rapid-fire follow-ups, drills into weak spots.
- `friendly` — warm and encouraging but probing.
- `silent_judge` — minimal reactions, unreadable.
- `rapid_fire` — high question throughput, tests composure under pressure.
- `culture_fit` — focuses on values, teamwork, motivation.
- `technical_expert` — deep technical drilldown, precision-focused.
- `executive` — strategic thinking, big-picture framing.

### 3.3 Company Style Modifiers (6)

| Style | Formality | Technical Depth | Behavioural Emphasis | Culture Questions |
|---|---|---|---|---|
| `faang` | 0 | +20 | Yes | Yes |
| `startup` | −20 | +10 | No | Yes |
| `consulting` | +30 | 0 | Yes | No |
| `enterprise` | +20 | +10 | Yes | No |
| `agency` | −10 | +15 | No | Yes |
| `government` | +40 | 0 | Yes | No |

### 3.4 Session Lengths (3)

Authoritative config in `types/database.ts → SESSION_LENGTH_CONFIG`.

| Length | Label | Duration | Max User Messages | Question Range |
|---|---|---|---|---|
| `short` | Quick Practice | ~15 min | 10 | 5–7 |
| `standard` | Standard Mock | ~30 min | 20 | 8–12 |
| `deep` | Deep Dive | ~45 min | 30 | 12–16 |

`max_user_messages` is enforced at the chat route level — after N user messages, the interviewer wraps up.

### 3.5 Difficulty Scale (1–10)

Applied as a personality modifier: `difficultyModifier = (difficulty − 5) × 5`, added to `directness`, `depth_preference`, `skepticism`, subtracted from `warmth` and `patience`. Clamped to `[0, 100]`.

### 3.6 Panel Mode

Panel interviews use multiple AI interviewers in one session, tracked via the `session_interviewers` junction table. Each panelist has a `seat_order`, `role_label`, and `is_lead` flag.

Panel presets (`types/panel.ts → PANEL_ROLE_PRESETS`):
- `engineering_loop` — Hiring Manager + Tech Lead + Senior Engineer
- `cross_functional` — Eng Manager + PM + Designer
- `exec_panel` — VP Eng + CTO + HR Director
- `startup_founders` — CEO + CTO

Each panelist has independent `conviction` (0–100), `sentiment` (−1 to 1), and label ("unconvinced", "warming_up", "impressed"), stored in `interview_sessions.panel_state`. Updated after every candidate response by `lib/ai/interview/panel.ts → runPanelTurn`.

### 3.7 Coding Mode (Technical Interviews)

When `interview_type = 'technical'`, the session can include a live coding challenge.

- 5 seeded challenges in `coding_challenges` (Two Sum, Valid Parentheses, Reverse Linked List, Binary Search, Merge Two Sorted Lists). Production should seed more.
- 7 supported languages via Judge0: JavaScript, TypeScript, Python, Java, Go, Rust, C++.
- User writes code in the editor, hits Run (executes via `/api/interview/[sessionId]/code/run`), tests against visible test cases.
- User hits Submit (`/api/interview/[sessionId]/code/submit`) — all test cases (including hidden) run, result stored in `code_submissions.test_results`.
- Coding activity is factored into the final score alongside conversational performance.

### 3.8 Voice Mode

Cartesia Sonic 3 streaming TTS (`lib/tts/cartesia-tts.ts`).

- 40ms time-to-first-audio (Turbo) / 90ms (Standard).
- 6 voices (3 male: Kiefer, Kyle, Leo; 3 female: Katie, Tessa, Maya). Voice IDs in `CARTESIA_VOICES` map.
- Each interviewer has a `voice_config` JSONB: `{ voice_id, speed, pitch, tts_enabled }`.
- TTS is called from `/api/tts` per assistant message, returns streaming audio bytes.
- `CARTESIA_API_KEY` server-side only.
- Voice mode toggle is per-session — stored in `interview_sessions.voice_enabled`.

### 3.9 Resume System

- Upload: `/api/resume/upload` accepts PDF, TXT, DOC, DOCX (max 5 MB). PDFs parsed with `pdf-parse`, DOCX with `mammoth`. Parsed to structured JSON by DeepSeek.
- Storage: `resumes` bucket in Supabase Storage — **private bucket only**. Access via short-lived signed URLs (1-hour TTL). Never expose public URLs — resumes contain PII.
- Vulnerability scan: `/api/resume/scan-vulnerabilities` — Mistral Small analyses the resume for weak spots, stored in `resume_insights` with `insight_type = 'vulnerability'`.
- Alignment analysis: `/api/resume/analyze-alignment` — runs post-interview, compares resume claims against what the candidate said. Stored as `insight_type = 'alignment'`.
- Suggestions: `/api/resume/suggestions` — improvement suggestions. Stored as `insight_type = 'suggestion'`.
- Only the most recent resume per user is treated as active (`get_active_resume` SQL function).

### 3.10 Job Description Analysis

- Paste: `/api/job-description` POST parses raw JD text into `required_skills`, `preferred_skills`, `experience_requirements`, `responsibilities`.
- Analyse: `/api/job-description/[id]/analyze` — compares JD against active resume. Computes `match_percentage`, `matched_skills`, `missing_required`, `missing_preferred`, `additional_skills`, `narrative_gaps`.
- Generate practice: `/api/job-description/[id]/generate-practice` — builds interview questions targeting the specific gaps.
- JD-targeted sessions: at interview creation, set `target_job_description_id` — the interviewer prompt is augmented with the gap context via `lib/resume/interview-context.ts → buildResumeTargetingPrompt`.

### 3.11 Custom Interviewer Creator

`/dashboard/interviewers/create` — user manually defines name, interview type, company style, role focus, backstory, personality sliders (6 traits, 0–100), red flags, green flags, pet peeves, favourite topics, voice, difficulty.

Stored in `interviewers` with `is_custom = true`. Gated on `hasPurchased`. These interviewers are re-usable across sessions and do not decrement the credit balance on creation.

### 3.12 Custom Scenario Builder

At session create:
- `archetype_mix`: blend 1–2 archetype keys. If two, personalities are averaged element-wise.
- `constraints`: array of behavioural modifiers forwarded into the system prompt.
- `trait_overrides`: explicit 0–100 overrides for any of the 6 personality traits, applied on top of the computed personality.

Stored on the session for replay/analytics. Gated on `hasPurchased`.

### 3.13 Salary Negotiation Simulator

`/dashboard/negotiate` — dedicated module, separate from the main interview engine.

- User provides: `target_role`, `company_name`, `current_offer_amount`, `target_amount`, `experience_years`, `additional_context`.
- AI plays an experienced recruiter/hiring manager who pushes back, counter-offers, and uses real negotiation tactics.
- Session ends when either party walks away or a final offer is reached.
- Scored on: `confidence_score`, `framing_score`, `strategy_score`, `composure_score`, `overall_score`.
- AI feedback identifies `key_tactics_used` and `improvements`.
- Stored in dedicated `negotiation_sessions` + `negotiation_messages` tables (not `interview_sessions`).
- Does NOT consume an interview credit — this is a separate product channel.

### 3.14 Scoring System

`SCORING_WEIGHTS` in `lib/ai/config.ts` per interview type. 6 dimensions:

- `clarity_score` — how clearly the candidate articulates
- `confidence_score` — confidence indicators in responses
- `relevance_score` — how on-topic answers are
- `technical_depth` — depth of technical reasoning
- `star_usage_score` — STAR method application (weighted 0 for case interviews)
- `communication_score` — overall communication quality

Plus an `overall_score` rolled up from the weighted dimensions. Stored in `session_scores` along with `strengths[]`, `improvements[]`, `ai_feedback`, `interviewer_impression`, `key_moments`.

### 3.15 Progress & Gamification

- `user_progress` per user: `total_sessions`, `total_hours`, `current_streak`, `longest_streak`, `avg_score`, `badges`, `last_session_at`.
- Streak logic: updates on session completion via `update_user_progress_on_session_complete` trigger. +1 if last session was yesterday, reset to 1 if gap >1 day.
- Badges are service-layer (`lib/progress/badge-service.ts`) — evaluated on progress update.

### 3.16 Outbound Webhooks (Enterprise feature)

Configured per-user, max 5 webhooks per user (enforced by `check_max_webhooks_per_user` trigger).

- Event types: `session.completed` (currently the only event).
- Payload signed with HMAC-SHA256 using `webhooks.secret` as the key.
- Delivery service: `lib/webhooks/webhook-service.ts`. Exponential-backoff retry, max 3 attempts.
- Each attempt logged in `webhook_deliveries` with status, status_code, response_body.
- Auto-disabled after 10 consecutive failures (via `update_webhook_stats` trigger).
- Test endpoint: `POST /api/webhooks/[webhookId]/test` sends a dummy payload.
- HTTPS-only (localhost allowed for dev testing).

### 3.17 Interview Replay

`/dashboard/interview/[sessionId]/replay` — walks through the full transcript with the timeline component. Shows interviewer mood shifts, panel impressions (if panel), code submissions (if coding), and per-message analysis. Read-only.

---

## 4. AI System & Models

### 4.1 OpenRouter Configuration

Config in `lib/ai/config.ts → OPENROUTER_CONFIG`:

```
Base URL: https://openrouter.ai/api/v1
HTTP-Referer: NEXT_PUBLIC_APP_URL (required by OpenRouter for attribution)
X-Title: UnderFireAI
```

### 4.2 Model Parameter Presets

```
interview: temperature 0.8, max_tokens 1024, top_p 0.95, freq/pres penalty 0.3/0.3
analysis:  temperature 0.3, max_tokens 2048, top_p 0.9,  freq/pres penalty 0/0
resumeParse: temperature 0.1, max_tokens 4096, top_p 0.9, freq/pres penalty 0/0
```

### 4.3 Prompt Pipeline

1. `buildCompanionSystemPrompt` (or equivalent in `lib/ai/interview/`) builds the interviewer system prompt from: archetype definition, personality, backstory, interview type, company style, role focus, session length, and optional resume-targeting context.
2. Message history retrieved from `interview_messages`.
3. Chat completion via `createChatCompletion` in `lib/ai/chat-client.ts`.
4. Response sanitized by `lib/ai/response-sanitizer.ts` — strips any AI-ism leakage, stage directions, meta commentary.
5. Mood update via `lib/ai/mood-engine.ts` — computes new `current_mood` on the interviewer.

### 4.4 Interviewer Backstory Generation

On new interviewer creation, `lib/ai/backstory-generator.ts` generates a ~200-word backstory grounded in the archetype, company style, and role focus. Stored on `interviewers.backstory`. This is the only 3rd-person narrative field — the active interviewer speaks in first person.

---

## 5. Database Schema

Supabase project ID: `nodkmtwchiivlwjktzis`. All tables have RLS enabled. 18 migrations, numbered chronologically.

### 5.1 Core Tables (11)

| Table | Purpose |
|---|---|
| `profiles` | User profile linked to `auth.users`. Auto-created on signup via `handle_new_user` trigger. Holds credit accounting, Stripe IDs, onboarding state. |
| `interviewers` | Auto-generated or custom interviewer definitions — personality, backstory, voice config, mood, difficulty. |
| `interviewer_personality` | 1:1 extension of `interviewers` — communication style, question patterns, flags, pet peeves, favourite topics. |
| `user_resumes` | Uploaded resumes with parsed structured data + storage path. |
| `interview_sessions` | Per-session state: interviewer, type, target role/company, difficulty, status, session length, panel state, coding challenge, resume targeting context, premium scenario fields. |
| `interview_messages` | Full message transcript. Roles: `interviewer`, `candidate`. Stores audio URL, response time, analysis JSON, optional `interviewer_id` for panel mode. |
| `session_scores` | One row per session on completion. 6 score dimensions + strengths/improvements/feedback + webhook sent state + resume alignment link. |
| `user_progress` | Per-user aggregate — sessions, hours, streaks, avg score, badges. |
| `interview_purchases` | Immutable purchase log. INSERT restricted to service role (RLS-enforced since `20260422000000`). |
| `session_interviewers` | Panel mode junction — ties interviewers to sessions with seat order, role label, lead flag. |
| `waitlist` | Pre-launch email signups. Populated only by `waitlist-signup` Edge Function using service role. |

### 5.2 Coding Interview Tables (2)

| Table | Purpose |
|---|---|
| `coding_challenges` | Seeded challenges with title, description, difficulty, category, languages, starter code (per language), test cases, hints, time limit. Readable by anyone. |
| `code_submissions` | Per-submission: session, challenge, language, code, status, test results, execution time, hints used. |

### 5.3 Resume & JD Tables (2)

| Table | Purpose |
|---|---|
| `resume_insights` | Stores alignment analyses, vulnerability scans, suggestions, and gap analyses. Typed by `insight_type`. |
| `job_descriptions` | Parsed JDs with skills, requirements, responsibilities, and post-analysis gap fields. |

### 5.4 Negotiation Tables (2)

| Table | Purpose |
|---|---|
| `negotiation_sessions` | Separate session lifecycle for salary negotiations. Context, scores, feedback, tactics. |
| `negotiation_messages` | Transcript. Roles: `recruiter`, `user`. |

### 5.5 Webhook Tables (2)

| Table | Purpose |
|---|---|
| `webhooks` | User-configured webhook endpoints — URL, secret, events, enabled flag, last-triggered state. Max 5 per user. |
| `webhook_deliveries` | Per-attempt delivery log with status, status_code, response_body, retry timing. |

### 5.6 Key Enums

- `interview_type`: `behavioral`, `technical`, `case`, `hr`, `panel`, `phone_screen`
- `company_style`: `faang`, `startup`, `consulting`, `enterprise`, `agency`, `government`
- `session_status`: `in_progress`, `completed`, `abandoned`, `paused`
- `message_role`: `interviewer`, `candidate`
- `subscription_tier`: `free`, `pro`, `premium` (premium deprecated; treated same as pro)
- `subscription_status`: `active`, `canceled`, `past_due`, `trialing`
- `session_length`: `short`, `standard`, `deep`
- `negotiation_status`: `in_progress`, `completed`, `abandoned`
- `negotiation_role`: `recruiter`, `user`

### 5.7 Key Database Functions (RPC)

| Function | Purpose |
|---|---|
| `handle_new_user()` | Signup trigger — creates `profiles` + `user_progress` row. |
| `update_updated_at_column()` | Generic updated_at trigger. |
| `update_interviewer_session_count()` | Increments `interviewers.total_sessions` on each session insert. |
| `update_user_progress_on_session_complete()` | Recomputes streak, hours, avg score when a session transitions to completed. |
| `grant_interview_credits(user_id, interviews, product, amount, pi_id, cs_id)` | Atomic credit grant + purchase record. Idempotent via UNIQUE constraints. |
| `decrement_interviews_used(user_id)` | Relative −1 decrement, clamped at 0. Used for rollback on session create failure. |
| `get_interviews_remaining(user_id)` | Returns `purchased - used`, clamped at 0. |
| `use_interview_credit(user_id)` | Legacy credit decrement. Prefer the optimistic-lock pattern in `/api/interview/create`. |
| `get_active_resume(user_id)` | Returns most recent resume ID. |
| `count_monthly_jd_analyses(user_id)` | Count of JDs analysed this calendar month. |
| `reset_monthly_interviews()` | Deprecated no-op. pg_cron job still calls it harmlessly. |
| `check_max_webhooks_per_user()` | Trigger — rejects webhook INSERT if user has 5+ already. |
| `update_webhook_stats()` | Trigger — updates webhook last_triggered, failure_count, auto-disables after 10 failures. |
| `get_waitlist_count()` | Returns waitlist COUNT for the Edge Function. |

### 5.8 Migration History

All 18 migrations are in `supabase/migrations/`:

```
20250121000000_initial_schema.sql                 — Core tables, RLS, triggers
20250214000000_session_length.sql                 — Session length enum + max_user_messages
20250215000000_voice_enabled.sql                  — voice_enabled flag on sessions
20250216000000_premium_scenario_fields.sql        — archetype_mix, constraints, trait_overrides
20250217000000_waitlist.sql                       — Waitlist table + get_waitlist_count()
20250225000000_monthly_reset_cron.sql             — pg_cron job (now no-op)
20250226000000_panel_interviews.sql               — session_interviewers + panel_state
20250227000000_coding_interviews.sql              — coding_challenges + code_submissions + seed data
20250228000000_webhooks.sql                       — webhooks + webhook_deliveries
20250301000000_resume_coaching.sql                — resume_insights + job_descriptions
20250302000000_resume_targeting.sql               — Session resume-targeting fields
20250303000000_custom_interviewers.sql            — interviewers.is_custom
20250304000000_negotiation_sessions.sql           — negotiation_sessions + negotiation_messages
20250305000000_session_scores_relevance.sql       — Adds missing relevance_score column
20250306000000_interview_credits.sql              — Convert to credit model + interview_purchases
20250307000000_fix_grant_interview_credits.sql    — Fix race condition, add idempotency
20260422000000_restrict_interview_purchases_insert.sql  — Drop broad INSERT policy (security fix)
20260422000001_decrement_interviews_used.sql      — Define rollback RPC
```

### 5.9 Storage Buckets

| Bucket | Public? | Purpose |
|---|---|---|
| `resumes` | **PRIVATE** | Resume uploads. Access via signed URLs, 1-hour TTL. Never make public. |

---

## 6. API Routes

All routes live under `app/api/`. Every route authenticates via `getCurrentUser()` before any DB or business logic, except the webhook endpoints and the TTS/voices public list.

### 6.1 Auth Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/callback` *(app route, not /api)* | Supabase OAuth/email-link PKCE callback. Validates `next` param starts with `/` to prevent open redirect. |

### 6.2 Account Routes

| Method | Route | Purpose |
|---|---|---|
| DELETE | `/api/account/delete` | Deletes the user from `auth.users`; cascade deletes everything downstream. Uses admin client. |

### 6.3 Interview Lifecycle Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/interview/create` | Create a new interview session. Validates credit balance, generates interviewer (or panel), optimistic-lock-decrements `interviews_used`, inserts session. Handles coding challenge selection, resume targeting context, premium scenario fields, panel preset setup. |
| POST | `/api/interview/generate-interviewer` | Generates an interviewer without creating a session (used in the setup flow for preview). |
| POST | `/api/interview/generate-scene` | Generates opening scene context for the 3D interviewer HUD. |
| POST | `/api/interview/[sessionId]/chat` | Main conversation endpoint. Appends candidate message, generates interviewer reply (DeepSeek), updates mood / panel state, persists both messages. Enforces `max_user_messages`. |
| POST | `/api/interview/[sessionId]/analyze` | Per-message analysis — STAR breakdown, confidence indicators, filler words. |
| POST | `/api/interview/[sessionId]/coaching` | Real-time coaching feedback on the most recent candidate answer. Quote-anchored — always pulls specific phrases from the transcript. |
| POST | `/api/interview/[sessionId]/pause` | Mark session `paused`. |
| POST | `/api/interview/[sessionId]/resume` | Mark session back to `in_progress`. |
| POST | `/api/interview/[sessionId]/end` | Mark session `completed`, compute duration, trigger scoring. Fires `session.completed` webhook. |
| POST | `/api/interview/[sessionId]/score` | Runs the full 6-dimension scoring via Mistral analysis model, writes to `session_scores`. |
| POST | `/api/interview/[sessionId]/code/run` | Execute candidate code (visible test cases) via Judge0. |
| POST | `/api/interview/[sessionId]/code/submit` | Execute against all tests (incl. hidden), persist in `code_submissions`. |
| GET | `/api/interview/recap` | Returns summary recap data for the recap modal. |

### 6.4 Interviewer Management Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/interviewer/create` | Create a custom interviewer (Premium — `hasPurchased` gated). |
| GET/PATCH/DELETE | `/api/interviewer/[interviewerId]` | Manage a single custom interviewer. |

### 6.5 Job Description Routes

| Method | Route | Purpose |
|---|---|---|
| GET/POST | `/api/job-description` | List or create JD. On create, parses the raw text into structured skills/requirements. |
| GET/PATCH/DELETE | `/api/job-description/[id]` | Manage a JD. |
| POST | `/api/job-description/[id]/analyze` | Gap analysis against the user's active resume. |
| POST | `/api/job-description/[id]/generate-practice` | Generates practice questions targeting the gaps. |

### 6.6 Resume Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/resume/upload` | Accept PDF/TXT/DOC/DOCX (5 MB max), parse, store to `resumes` bucket, create `user_resumes` row, run vulnerability scan in background. |
| POST | `/api/resume/extract` | Re-parse an existing resume (used when upload parsing fails). |
| POST | `/api/resume/scan-vulnerabilities` | Dedicated vulnerability scan endpoint. |
| POST | `/api/resume/analyze-alignment` | Post-interview resume↔transcript alignment analysis. |
| POST | `/api/resume/suggestions` | Generate resume improvement suggestions. |

### 6.7 Negotiation Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/negotiate/create` | Create a new negotiation session. Does NOT consume an interview credit. |
| POST | `/api/negotiate/[sessionId]/chat` | Negotiation conversation turn. |
| POST | `/api/negotiate/[sessionId]/end` | Complete, score, and generate feedback. |

### 6.8 Progress Route

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/progress` | Returns `user_progress` + aggregate stats for the progress dashboard. |

### 6.9 TTS & Voice Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/voices` | List available Cartesia voices (public). |
| POST | `/api/tts` | Generate speech audio via Cartesia Sonic 3. Requires authenticated user + an active session. |

### 6.10 Stripe Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/stripe/create-checkout` | Create one-time Stripe Checkout for `starter_6`, `pro_11`, or `refill_5`. Enforces refill-requires-prior-purchase rule. |
| POST | `/api/stripe/create-portal` | Create Stripe Customer Portal session for the current user. |
| POST | `/api/stripe/webhook` | Handle Stripe events: `checkout.session.completed`, `payment_intent.succeeded`, legacy subscription events. All credit grants go through `grant_interview_credits` RPC. Signature-verified. |

### 6.11 Webhook Management Routes

| Method | Route | Purpose |
|---|---|---|
| GET/POST | `/api/webhooks` | List or create user webhooks. Zod-validated. Max 5 per user. |
| GET/PATCH/DELETE | `/api/webhooks/[webhookId]` | Manage a single webhook. |
| POST | `/api/webhooks/[webhookId]/test` | Send a test delivery. |

---

## 7. Environment Variables

All variables must be configured in `.env.local` (dev) and Vercel project settings (production).

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL, no trailing slash. `http://localhost:3000` or `https://underfireai.com`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (public). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public). |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role — server only. Never expose to browser. |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret — server only. |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret. |
| `STRIPE_STARTER_PRICE_ID` | Yes | Stripe Price ID for Starter Pack ($25 / 6 interviews). One-time. |
| `STRIPE_PRO_PACK_PRICE_ID` | Yes | Stripe Price ID for Pro Pack ($35 / 11 interviews). One-time. |
| `STRIPE_REFILL_PRICE_ID` | Yes | Stripe Price ID for Refill Pack ($10 / 5 interviews). One-time. |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for all AI routing (DeepSeek, Mistral, Claude fallback). |
| `CARTESIA_API_KEY` | Yes (voice mode) | Cartesia Sonic 3 TTS key. |
| `JUDGE0_RAPIDAPI_KEY` | Yes (coding mode) | RapidAPI key for Judge0 CE hosted sandbox. |
| `JUDGE0_RAPIDAPI_HOST` | Yes (coding mode) | RapidAPI host — typically `judge0-ce.p.rapidapi.com`. |
| `SMTP_HOST` | Yes (waitlist) | Hostinger SMTP host (for the waitlist Edge Function). |
| `SMTP_PORT` | Yes (waitlist) | SMTP port — typically 465. |
| `SMTP_USER` | Yes (waitlist) | SMTP username (`hello@underfireai.com`). |
| `SMTP_PASS` | Yes (waitlist) | SMTP password. |
| `NEXT_PUBLIC_ENABLE_*` | Optional | Client-side feature flags. |

NOTE — no Anthropic API key. All AI traffic goes via OpenRouter.

---

## 8. Security Model

### 8.1 Row Level Security

Every table has RLS enabled. Policies enforce per-user isolation — users can only read/write rows where `user_id = auth.uid()` or through a session they own.

- `interview_purchases` has INSERT denied for `anon` and `authenticated` (migration `20260422000000`). Only the service-role webhook handler can insert purchases.
- `coding_challenges` is globally readable (it's seed content).
- All transcript, score, and session tables enforce ownership via the parent `interview_sessions.user_id`.

### 8.2 Service Role Client

Service role is used ONLY in:
- `/api/stripe/webhook` — needs to write purchases and update profiles cross-user.
- `/api/account/delete` — needs `auth.admin.deleteUser`.
- `supabase/functions/waitlist-signup` Edge Function — writes to `waitlist` which has no public INSERT policy.

Never imported into client components, page components, or standard API routes.

### 8.3 Stripe Webhook Signature Verification

`/api/stripe/webhook` calls `stripe.webhooks.constructEvent(body, signature, webhookSecret)` before processing any event. Invalid signatures return 400.

### 8.4 Optimistic Lock on Credit Consumption

`/api/interview/create` uses a two-part atomic pattern:

```
UPDATE profiles
SET interviews_used = expectedUsed + 1
WHERE id = userId AND interviews_used = expectedUsed
```

If 0 rows affected → concurrent modification → return 409. On session INSERT failure, `decrement_interviews_used` RPC performs a relative −1 decrement so a concurrent successful create isn't clobbered.

### 8.5 Idempotent Stripe Credit Grants

`grant_interview_credits` inserts `interview_purchases` FIRST using UNIQUE constraints on `(stripe_payment_intent_id)` and `(stripe_checkout_session_id)`. Only one of `checkout.session.completed` and `payment_intent.succeeded` wins — the other is a no-op.

### 8.6 Open Redirect Prevention

`/callback` route validates the `next` query parameter starts with `/`. If not, falls back to `/dashboard`.

### 8.7 Content Security Policy

`next.config.ts` ships a full CSP in every response:
- `default-src 'self'`
- `script-src` allows `'unsafe-inline' 'unsafe-eval'` (required by Next.js/React hydration + GSAP/Three) plus `va.vercel-scripts.com`.
- `img-src` locks to self, data URIs, Supabase storage, `images.unsplash.com`.
- `connect-src` locks to Supabase (HTTPS + WSS) + Vercel analytics.
- `frame-src 'none'`, `frame-ancestors 'none'` — no embedding.
- `HSTS` with 2-year preload.

### 8.8 Private Resume Bucket

`resumes` bucket must be private. Files contain full PII. Always surface via `getResumeSignedUrl()` (1-hour TTL), never via `getPublicUrl()`.

### 8.9 Webhook HMAC Signing

Outbound webhook payloads are signed with HMAC-SHA256 using the user-provided `webhooks.secret`. Header: `X-UnderFire-Signature: sha256=<hex>`.

### 8.10 Input Validation (Zod)

Implemented on webhook routes (`createWebhookSchema` in `/api/webhooks/route.ts`). **Known gap: not yet applied to every API route.** See §12 Known Issues.

---

## 9. Application Routes

### 9.1 Marketing / Public Routes

- `/` — Landing page (animated hero, features, pricing, FAQ)
- `/faq` — FAQ page
- `/privacy` — Privacy policy
- `/terms` — Terms of service

### 9.2 Auth Routes

- `/login` — Email + password sign in
- `/register` — Registration
- `/callback` — Supabase OAuth / email-link PKCE callback
- `/forgot-password` — Password reset request
- `/reset-password` — Password reset form (from email link)

### 9.3 Dashboard Routes

- `/dashboard` — Overview: recent sessions, progress stats, available credits, quick-start
- `/interview/new` — Interview setup form (type, company, role, difficulty, length, voice, panel preset, coding language, premium scenario)
- `/interview/[sessionId]` — Active interview chat UI + HUD + voice mode
- `/interview/[sessionId]/results` — Post-session scores, strengths, improvements, interviewer impression
- `/interview/[sessionId]/replay` — Full transcript replay with timeline
- `/interviewers` — Custom interviewer list
- `/interviewers/create` — Custom interviewer creator
- `/job-analysis` — JD analysis dashboard + practice generation
- `/resume` — Resume upload + active resume preview
- `/resume-insights` — Vulnerability scan + alignment + suggestions
- `/negotiate` — Salary negotiation module home
- `/negotiate/[sessionId]` — Active negotiation session
- `/progress` — Full progress analytics with charts (Recharts)
- `/history` — Past sessions list
- `/settings` — Profile, billing (checkout + portal), webhooks, account delete
- `/account` *(legacy redirect or alias to /settings)*

---

## 10. Development Phases

This is not a greenfield project — it is live. Phases describe the state of the product, not a planned build-out.

### Phase 1 — Foundation (COMPLETE)

Next.js 15.1 / React 19 / TypeScript strict / Tailwind 3.4. Supabase wired. Auth (email + password) + `/callback` route. Core schema (migration 001). Dashboard layout with sidebar + header. Sign-out flow.

### Phase 2 — Interview Engine Core (COMPLETE)

- 6 interview types, 8 archetypes, 6 company styles, 3 session lengths.
- `/api/interview/create` with optimistic credit lock + interviewer generation.
- `/api/interview/[sessionId]/chat` with DeepSeek, mood engine, response sanitizer.
- `/api/interview/[sessionId]/end` + `/score` with Mistral analysis.
- STAR scoring across 6 dimensions.
- Per-message analysis + coaching feedback (quote-anchored).

### Phase 3 — Voice Mode (COMPLETE)

Cartesia Sonic 3 integration, 6 voices, streaming TTS, `voice_config` on interviewers, `voice_enabled` on sessions, `/api/tts` + `/api/voices`.

### Phase 4 — Panel Interviews (COMPLETE)

`session_interviewers` junction table, 4 panel presets, per-interviewer impression tracking, `panel_state` JSONB, `runPanelTurn` engine, panel-aware chat UI.

### Phase 5 — Coding Interviews (COMPLETE)

`coding_challenges` + `code_submissions` tables, 5 seeded challenges, Judge0 integration with 7 languages, `/api/interview/[sessionId]/code/run` + `/submit`, code editor UI with test-case panel.

### Phase 6 — Resume Coaching (COMPLETE)

Private `resumes` bucket, PDF/DOCX parsing, `user_resumes` with parsed JSON, `resume_insights` with 4 insight types, vulnerability scanner, alignment analyzer, suggestions generator, resume-targeted interview context.

### Phase 7 — Job Description Analysis (COMPLETE)

`job_descriptions` table, JD parsing, gap analysis vs active resume, `/api/job-description/[id]/generate-practice` for gap-targeted interviews, `target_job_description_id` wiring into session creation.

### Phase 8 — Custom Interviewers & Scenario Builder (COMPLETE)

`is_custom` flag on interviewers, `/dashboard/interviewers/create`, `archetype_mix` / `constraints` / `trait_overrides` session fields, blend + override logic in `/api/interview/create`. Gated on `hasPurchased`.

### Phase 9 — Salary Negotiation (COMPLETE)

Dedicated `negotiation_sessions` + `negotiation_messages`, negotiation chat engine (separate from main interview engine), `/dashboard/negotiate` + `/negotiate/[sessionId]`, 5-dimension scoring (confidence / framing / strategy / composure / overall), tactic identification, AI feedback.

### Phase 10 — Webhooks (COMPLETE)

`webhooks` + `webhook_deliveries`, max 5 per user trigger-enforced, HMAC-SHA256 signing, exponential backoff retry, auto-disable after 10 failures, test endpoint, `session.completed` event wired from `/api/interview/[sessionId]/end`.

### Phase 11 — Credit Model Migration (COMPLETE)

Migrated from subscription tiers to one-time credit packs. `interview_purchases` audit table, `grant_interview_credits` idempotent RPC, refill-requires-prior-purchase rule, legacy subscription handlers retained in webhook for backwards compatibility with still-active subscribers.

### Phase 12 — Security Hardening (IN PROGRESS — most landed April 2026)

- **(DONE)** Dropped broad INSERT policy on `interview_purchases` (migration `20260422000000`).
- **(DONE)** Defined `decrement_interviews_used` RPC for reliable credit rollback (migration `20260422000001`).
- **(DONE)** Fixed `grant_interview_credits` race condition (migration `20250307`).
- **(DONE)** Full CSP + HSTS in `next.config.ts`.
- **(DONE)** Private resumes bucket + signed URLs.
- **(OPEN)** Zod input validation on every API route (currently only on webhook routes — see §12).

### Phase 13 — Polish, SEO & Launch (ONGOING)

Landing page, animated hero (GSAP + parallax), pricing section, FAQ, privacy, terms, metadata/OG tags, `sitemap.ts`, `robots.ts`, Vercel Analytics, error boundaries, loading states.

---

## 11. Third-Party Services

| Service | Purpose | UI Label | Critical? |
|---|---|---|---|
| OpenRouter → DeepSeek V3 | Interview conversations | "AI-powered" (generic) | Yes |
| OpenRouter → Mistral Small 3.1 | Analysis, scoring, coaching | (not visible) | Yes |
| OpenRouter → Claude Haiku | Fallback only | (not visible) | No (reliability) |
| Cartesia Sonic 3 | Voice mode TTS | (not visible, voice icon only) | Voice mode only |
| Judge0 (RapidAPI) | Code execution | (not visible) | Coding mode only |
| Stripe | One-time payments | Stripe (checkout redirect) | Yes |
| Supabase | DB, auth, storage, realtime | (not visible) | Yes |
| Hostinger SMTP | Waitlist emails | (not visible) | Launch phase only |
| Vercel | Hosting + Analytics | (not visible) | Yes |

---

## 12. Known Issues & Backlog

### 12.1 Open Issues

- **Zod validation gap** — Webhook routes use `createWebhookSchema`. Every other POST/PATCH route still does raw `request.json()` destructuring. Before adding more write-routes, land a shared `lib/validation/` with per-route schemas.
- **Legacy subscription backfill** — The Stripe webhook still handles `customer.subscription.created/updated/deleted` to support the handful of users still on legacy monthly subscriptions. These handlers grant 11 credits per renewal and keep `subscription_period_end` updated. Remove only when all legacy subscribers are confirmed migrated or cancelled.
- **pg_cron no-op** — Monthly reset job still runs but calls the deprecated no-op function. Safe but clutter. Disable in Supabase Dashboard when convenient.
- **Coding challenge library is thin** — 5 seeded challenges only. Production should expand to 30+ covering all difficulties and categories before more users hit technical mode.
- **Interviewer prompt consistency across types** — Ensure `buildCompanionSystemPrompt` passes through constraints, resume-targeting context, and panel-specific instructions cleanly for each interview_type. Audit on any prompt pipeline change.
- **Streak logic uses UTC calendar days, not user-local** — `update_user_progress_on_session_complete` (trigger on `interview_sessions`) computes `current_streak`/`longest_streak` via `DATE(last_session_at) = CURRENT_DATE - INTERVAL '1 day'`, which resolves against the database session's timezone (effectively UTC), not each user's local calendar day. A user practicing late at night in a non-UTC timezone could see their streak break or double-count across what is, for them, the same calendar day. Flagged during the 2026-07-13 audit-checklist walk (§4). Fixing properly needs a per-user timezone (new `profiles.timezone` column, captured client-side) and reworked streak logic — deliberately not done as a blind fix; needs a product decision on whether UTC-day streaks are acceptable or worth the schema change.

### 12.2 Parked Features (out of scope unless explicitly revived)

- Real-time voice recognition (speech-to-text) for candidate input. Currently text-only with TTS-only voice output.
- Multi-language interviews. System is English-only; Cartesia supports 42 languages but the prompt pipeline is not localised.
- Team / organisation accounts (recruiter seat sharing).
- Interview video recording or avatar animation beyond the existing HUD.
- ATS inbound integrations (Greenhouse, Lever). Outbound webhooks only.
- Public share links for completed interviews.
- Leaderboards / social gamification.
- Mobile native apps. Responsive web only.
- Subscription billing. Credit-pack model is the permanent business model.

### 12.3 Design Invariants (do not violate)

- No subscriptions, ever. Credit packs only.
- Never use the Anthropic SDK directly. OpenRouter only.
- Never expose a public URL for a resume file.
- Never write to `interview_purchases` outside the service-role webhook.
- Never suppress a TypeScript or ESLint error — fix at root cause.
- Never ship snippets, diffs, or partial files. Full files only, section by section.
- Credits never expire. Don't add TTL logic to `profiles.purchased_interviews`.
