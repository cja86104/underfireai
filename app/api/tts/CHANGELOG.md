# TTS Provider Migration — Cartesia → OpenAI

**Date:** May 2026  
**Scope:** `app/api/tts/`, `lib/tts/`, `app/api/voices/`, `types/interviewer.ts`, `lib/ai/config.ts`

## Why

Cartesia billed $50/month for 1.25M characters on a hard monthly cap. Hitting the cap returned 402 errors mid-session with no graceful fallback. OpenAI TTS (`tts-1`) is pure pay-per-use at $15/1M characters with no monthly ceiling — at current session volume the cost is negligible and the cap problem is eliminated.

## What Changed

### Replaced
`lib/tts/cartesia-tts.ts` — deleted entirely.

### Added
`lib/tts/openai-tts.ts` — OpenAI TTS client. Single full-text call per message (no sentence chunking — preserves prosody across the full utterance, which is an explicit architectural requirement for this product). Resolves short voice key names to OpenAI voice IDs at call time. Falls back to `alloy` on unknown keys.

### Modified

**`app/api/tts/route.ts`**  
Imports and calls `generateSpeech` from `openai-tts` instead of `cartesia-tts`. `resolveVoiceKey` now checks against `OPENAI_VOICES` keys. Speed is passed as the numeric value stored in `voice_config.speed` (clamped to OpenAI's `0.25–4.0` range inside `generateSpeech`). All auth, ownership, and rate-limit logic is unchanged.

**`app/api/voices/route.ts`**  
Provider metadata updated from `cartesia` / `sonic-3` to `openai` / `tts-1`. `cartesiaId` field replaced with `openAIId` in the voice list response.

**`types/interviewer.ts`**  
`CartesiaVoice` type renamed to `OpenAIVoiceKey`. `cartesiaId` field renamed to `openAIId` in `VoiceOption` interface and all six `VOICE_OPTIONS` entries. **Voice key names (`katie`, `kiefer`, `tessa`, `kyle`, `leo`, `maya`) are identical** — no database migration required. All existing `voice_config` JSONB rows continue to work without modification.

**`lib/ai/config.ts`**  
`TTS_VOICES` constant updated to `openAIId` fields with correct OpenAI voice ID values.

## Voice Mapping

| Key (DB `voice_id`) | OpenAI Voice | Character |
|---|---|---|
| `katie` | `alloy` | Professional, clear |
| `kiefer` | `onyx` | Confident, direct |
| `tessa` | `nova` | Warm, engaging |
| `kyle` | `echo` | Dynamic, energetic |
| `leo` | `fable` | Deep, authoritative |
| `maya` | `shimmer` | Friendly, approachable |

## Environment Variables

- **Add:** `OPENAI_API_KEY` (already present in Vercel for other routes)
- **Remove:** `CARTESIA_API_KEY` (can be deleted from Vercel when ready)

## No Migration Required

`voice_config` is stored as JSONB with `voice_id` holding the short key name (e.g. `"katie"`). The key names are identical in the new mapping. No SQL migration, no data backfill.
