/**
 * UnderFireAI — OpenAI Speech-to-Text (Whisper) client
 *
 * Provider: OpenAI Audio Transcriptions API
 *           https://api.openai.com/v1/audio/transcriptions
 * Model:    whisper-1 — stable, available on all OpenAI accounts, ~$0.006/min.
 * Key:      reuses process.env.OPENAI_API_KEY (same key as lib/tts/openai-tts.ts).
 *
 * Why this exists: iOS Safari's webkitSpeechRecognition never opens the real
 * microphone (it routes through Apple Dictation) and is unreliable, so the
 * mobile voice-input path records audio with MediaRecorder and uploads it to
 * app/api/interview/[sessionId]/transcribe, which calls this helper.
 *
 * Convention matches lib/tts/openai-tts.ts: raw fetch (no SDK), key read at
 * call time, errors thrown with messages the route maps to status codes.
 */

const OPENAI_STT_URL = 'https://api.openai.com/v1/audio/transcriptions';

/** Whisper transcription model. Stable and universally available. */
export const OPENAI_STT_MODEL = 'whisper-1';

/**
 * Max audio bytes accepted. Capped to stay under Vercel's serverless request
 * body limit (~4.5 MB) — the platform rejects larger bodies before the route
 * runs, so the mobile client also limits recording duration. Whisper itself
 * permits up to 25 MB.
 */
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export function isOpenAISTTConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface TranscriptionResult {
  text: string;
}

interface TranscribeArgs {
  /** Audio file from request.formData(). */
  file: File;
  /** Optional BCP-47 language hint (e.g. 'en') — improves speed + accuracy. */
  language?: string;
}

/**
 * Whisper detects the audio container from the upload filename extension.
 * MediaRecorder blobs often have no name, so derive a correct extension from
 * the MIME type when the provided name lacks one.
 */
function filenameFor(file: File): string {
  if (file.name && /\.(webm|mp4|m4a|mp3|mpga|wav|ogg|oga|flac)$/i.test(file.name)) {
    return file.name;
  }
  const base = (file.type || '').split(';')[0].trim().toLowerCase();
  const ext =
    base === 'audio/mp4' || base === 'audio/m4a' || base === 'audio/x-m4a'
      ? 'mp4'
      : base === 'audio/webm'
        ? 'webm'
        : base === 'audio/mpeg' || base === 'audio/mpga'
          ? 'mp3'
          : base === 'audio/wav' || base === 'audio/x-wav'
            ? 'wav'
            : base === 'audio/ogg'
              ? 'ogg'
              : 'webm';
  return `audio.${ext}`;
}

/**
 * Transcribe an audio File via OpenAI Whisper. Throws on configuration, auth,
 * rate-limit, or upstream errors; the route maps these to status codes,
 * mirroring lib/tts/openai-tts.ts.
 */
export async function transcribeAudio({
  file,
  language,
}: TranscribeArgs): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const form = new FormData();
  // Do NOT set Content-Type by hand — fetch derives the multipart boundary
  // from the FormData body; a hand-set header breaks the boundary.
  form.append('file', file, filenameFor(file));
  form.append('model', OPENAI_STT_MODEL);
  form.append('response_format', 'json');
  if (language) {
    form.append('language', language);
  }

  let response: Response;
  try {
    response = await fetch(OPENAI_STT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch (err) {
    throw new Error(
      `Speech-to-text request failed: ${err instanceof Error ? err.message : 'network error'}`,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key');
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
