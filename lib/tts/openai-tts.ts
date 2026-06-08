/**
 * UnderFireAI — OpenAI TTS Client
 *
 * Provider: OpenAI Audio Speech API
 * Model:    tts-1 (low-latency, ~500-800ms per request)
 * Cost:     $15 per 1M characters — no monthly cap, pure pay-per-use
 * Voices:   alloy, echo, fable, onyx, nova, shimmer
 *
 * Voice mapping from prior Cartesia key names (stored in voice_config JSONB):
 *   katie   → alloy   (professional, clear)
 *   kiefer  → onyx    (confident, direct)
 *   tessa   → nova    (warm, engaging)
 *   kyle    → echo    (dynamic, energetic)
 *   leo     → fable   (deep, authoritative)
 *   maya    → shimmer (friendly, approachable)
 *
 * No database migration required — voice_id keys are unchanged in the DB.
 * The route resolves the key name to the OpenAI voice ID at call time.
 */

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

// ─────────────────────────────────────────────────────────────────────────────
// Voice definitions
// Key names match the existing voice_config.voice_id values in the database.
// ─────────────────────────────────────────────────────────────────────────────

export const OPENAI_VOICES = {
  katie: {
    id: 'alloy' as const,
    name: 'Katie',
    description: 'Professional and clear',
    gender: 'feminine' as const,
    personality: 'Professional, composed, articulate',
  },
  kiefer: {
    id: 'onyx' as const,
    name: 'Kiefer',
    description: 'Confident and direct',
    gender: 'masculine' as const,
    personality: 'Confident, direct, business-like',
  },
  tessa: {
    id: 'nova' as const,
    name: 'Tessa',
    description: 'Warm and engaging',
    gender: 'feminine' as const,
    personality: 'Warm, engaging, encouraging',
  },
  kyle: {
    id: 'echo' as const,
    name: 'Kyle',
    description: 'Dynamic and energetic',
    gender: 'masculine' as const,
    personality: 'Dynamic, energetic, thoughtful',
  },
  leo: {
    id: 'fable' as const,
    name: 'Leo',
    description: 'Deep and authoritative',
    gender: 'masculine' as const,
    personality: 'Authoritative, serious, senior executive',
  },
  maya: {
    id: 'shimmer' as const,
    name: 'Maya',
    description: 'Friendly and approachable',
    gender: 'feminine' as const,
    personality: 'Friendly, approachable, supportive',
  },
} as const;

export type OpenAIVoiceKey = keyof typeof OPENAI_VOICES;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateSpeechOptions {
  text: string;
  /** Short key name from voice_config.voice_id (e.g. 'katie'). */
  voiceKey: string;
  /** Numeric speed from voice_config.speed. Clamped to OpenAI's 0.25–4.0 range. */
  speed?: number;
}

export interface SpeechResponse {
  audioBuffer: ArrayBuffer;
  contentType: string;
  characterCount: number;
  estimatedDuration: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a DB voice_id key to the OpenAI voice ID string.
 * Falls back to 'alloy' (Katie equivalent) on unknown keys so playback
 * never hard-fails due to a stale or unrecognised voice config.
 */
export function resolveOpenAIVoiceId(voiceKey: string): string {
  const entry = OPENAI_VOICES[voiceKey as OpenAIVoiceKey];
  if (entry) return entry.id;
  console.warn(`[TTS] Unknown voice key "${voiceKey}" — falling back to alloy`);
  return 'alloy';
}

export function isOpenAITTSConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate speech audio from text using OpenAI TTS.
 * Returns an MP3 ArrayBuffer ready to stream to the client.
 *
 * UnderFire always sends the full response text as one call — no sentence
 * chunking — so that prosody is preserved across the entire utterance.
 * (Sentence-chunked TTS destroys intonation at boundaries; this was an
 * explicit architectural decision recorded in lib/hud/session-store.ts.)
 */
export async function generateSpeech(
  options: GenerateSpeechOptions,
): Promise<SpeechResponse> {
  const { text, voiceKey, speed = 1.0 } = options;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const openAIVoiceId = resolveOpenAIVoiceId(voiceKey);

  // Clamp to OpenAI's valid speed range.
  const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));

  // OpenAI hard limit is 4 096 characters per request.
  const MAX_CHARS = 4096;
  const truncatedText = text.slice(0, MAX_CHARS);

  const response = await fetch(OPENAI_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: truncatedText,
      voice: openAIVoiceId,
      speed: clampedSpeed,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    // Read and discard the error body — it may echo the input text which
    // contains session context we do not want in server logs.
    await response.text().catch(() => '');
    console.error('[TTS] OpenAI API error: status =', response.status);

    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key');
    }
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 400) {
      throw new Error('Bad request: TTS service rejected the input');
    }
    throw new Error(`TTS generation failed: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();

  // Estimate duration: ~150 wpm × ~5 chars/word = 12.5 chars/sec at normal speed.
  const estimatedDuration = (truncatedText.length / 12.5) / clampedSpeed;

  return {
    audioBuffer,
    contentType: 'audio/mpeg',
    characterCount: truncatedText.length,
    estimatedDuration,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming variant
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Streaming response shape, parallel to SpeechResponse.
 *
 * The stream is the raw audio/mpeg ReadableStream straight from OpenAI's
 * response.body — pipe it through to the client without buffering so playback
 * can start as soon as the first bytes arrive (typically ~500-1000 ms after
 * the request) instead of waiting for the entire utterance to download
 * (typically 4-8 s for a paragraph-length response).
 *
 * The caller MUST consume the stream exactly once. Reading from it twice
 * throws a TypeError per the Web Streams spec.
 */
export interface SpeechStreamResponse {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  characterCount: number;
  estimatedDuration: number;
}

/**
 * Streaming variant of generateSpeech().
 *
 * Identical to generateSpeech() through the OpenAI request — same auth,
 * same voice resolution, same speed clamping, same MAX_CHARS truncation,
 * same error mapping — but returns the response body as a ReadableStream
 * instead of awaiting arrayBuffer(). The /api/tts route forwards this stream
 * to the browser; the browser feeds it into a MediaSource so audio begins
 * on the first chunk, not after the last byte downloads.
 *
 * generateSpeech() is preserved unchanged for any caller that needs the
 * full ArrayBuffer (preview generation, caching, voice sampling). This
 * function is purely additive — no existing call sites are affected.
 */
export async function generateSpeechStream(
  options: GenerateSpeechOptions,
): Promise<SpeechStreamResponse> {
  const { text, voiceKey, speed = 1.0 } = options;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const openAIVoiceId = resolveOpenAIVoiceId(voiceKey);

  // Clamp to OpenAI's valid speed range.
  const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));

  // OpenAI hard limit is 4 096 characters per request.
  const MAX_CHARS = 4096;
  const truncatedText = text.slice(0, MAX_CHARS);

  const response = await fetch(OPENAI_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: truncatedText,
      voice: openAIVoiceId,
      speed: clampedSpeed,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    // Drain and discard the error body — it may echo the input text, which
    // contains session context we do not want in server logs.
    await response.text().catch(() => '');
    console.error('[TTS] OpenAI API error (stream): status =', response.status);

    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key');
    }
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 400) {
      throw new Error('Bad request: TTS service rejected the input');
    }
    throw new Error(`TTS generation failed: ${response.status}`);
  }

  // response.body is the ReadableStream of audio/mpeg bytes. It is only null
  // on truly empty responses, which OpenAI's audio/speech endpoint never
  // returns when the status is 200 — but we guard explicitly so the type
  // narrows to non-null and a future provider behaviour change surfaces as
  // a loud error instead of a silent corrupted audio response.
  if (!response.body) {
    throw new Error('TTS streaming response had no body');
  }

  // Same heuristic as generateSpeech(): ~150 wpm × ~5 chars/word = 12.5
  // chars/sec at normal speed. The /api/tts route emits this in the
  // X-Estimated-Duration header for client-side analytics.
  const estimatedDuration = (truncatedText.length / 12.5) / clampedSpeed;

  return {
    stream: response.body,
    contentType: 'audio/mpeg',
    characterCount: truncatedText.length,
    estimatedDuration,
  };
}
