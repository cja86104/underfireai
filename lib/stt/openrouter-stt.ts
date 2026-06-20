/**
 * UnderFireAI — Speech-to-Text via OpenRouter (Groq Whisper)
 *
 * Endpoint: https://openrouter.ai/api/v1/audio/transcriptions
 * Model:    openai/whisper-large-v3-turbo — served exclusively by Groq on
 *           OpenRouter (~$0.0007/min, roughly 9x cheaper than OpenAI whisper-1).
 * Key:      reuses process.env.OPENROUTER_API_KEY (same key as the chat LLM in
 *           lib/ai/chat-client.ts). No OpenAI key required for transcription.
 *
 * The mobile voice path records the answer with MediaRecorder and uploads it to
 * app/api/interview/[sessionId]/transcribe, which calls transcribeAudio() here.
 *
 * OpenRouter's STT API takes a JSON body with base64-encoded audio (NOT
 * multipart), so we read the uploaded File, base64-encode the raw bytes, and
 * pass the container format derived from the File's MIME type.
 */
import { OPENROUTER_CONFIG } from '@/lib/ai/config';

const OPENROUTER_STT_URL = `${OPENROUTER_CONFIG.baseUrl}/audio/transcriptions`;

/** Groq-served Whisper turbo: cheapest + fastest STT available on OpenRouter. */
export const STT_MODEL = 'openai/whisper-large-v3-turbo';

/**
 * Max audio bytes accepted by the route. Capped under Vercel's serverless
 * request-body limit (~4.5 MB); the mobile client also caps recording length.
 */
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export function isSttConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

export interface TranscriptionResult {
  text: string;
}

interface TranscribeArgs {
  /** Audio file from request.formData(). */
  file: File;
  /** Optional ISO-639-1 language hint (e.g. 'en'). */
  language?: string;
}

/** Map an uploaded blob's MIME type to OpenRouter's `format` field. */
function formatForMime(mime: string): string {
  const base = (mime || '').split(';')[0].trim().toLowerCase();
  if (base === 'audio/mp4' || base === 'audio/m4a' || base === 'audio/x-m4a') return 'm4a';
  if (base === 'audio/webm') return 'webm';
  if (base === 'audio/mpeg' || base === 'audio/mpga') return 'mp3';
  if (base === 'audio/wav' || base === 'audio/x-wav') return 'wav';
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/aac') return 'aac';
  if (base === 'audio/flac') return 'flac';
  return 'webm';
}

/**
 * Transcribe an audio File via OpenRouter (Groq Whisper). Throws on config,
 * auth, rate-limit, or upstream errors; the route maps these to status codes.
 */
export async function transcribeAudio({
  file,
  language,
}: TranscribeArgs): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString('base64');

  const body = {
    model: STT_MODEL,
    input_audio: {
      data: base64,
      format: formatForMime(file.type),
    },
    ...(language ? { language } : {}),
  };

  let response: Response;
  try {
    response = await fetch(OPENROUTER_STT_URL, {
      method: 'POST',
      headers: {
        ...OPENROUTER_CONFIG.defaultHeaders,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `Speech-to-text request failed: ${err instanceof Error ? err.message : 'network error'}`,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error('Invalid OpenRouter API key');
    }
    if (response.status === 429) {
      throw new Error('Rate limit exceeded at speech-to-text provider');
    }
    throw new Error(
      `Speech-to-text failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`,
    );
  }

  const data = (await response.json().catch(() => null)) as { text?: string } | null;
  return { text: (data?.text ?? '').trim() };
}
