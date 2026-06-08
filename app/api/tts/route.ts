import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import {
  generateSpeechStream,
  OPENAI_VOICES,
  isOpenAITTSConfigured,
} from '@/lib/tts/openai-tts';
import type { VoiceConfig } from '@/types/database';

/**
 * Request body for TTS generation.
 *
 * `message_id` is the only client-provided input. The route looks the
 * corresponding row up in `interview_messages`, verifies session ownership
 * via `interview_sessions.user_id`, confirms the message was produced by an
 * interviewer (not the candidate), and uses the stored content as the TTS
 * input. Voice and speed are derived from the interviewer's persisted
 * `voice_config`, never from the request body — this prevents an attacker
 * with a valid session from sending arbitrary text to burn TTS credit.
 */
interface TTSRequest {
  message_id: string;
}

// Standard UUID v4 / v1 / etc. Matches what Supabase/Postgres emits for
// `uuid_generate_v4()`. Rejecting non-UUID strings early avoids a wasted
// DB round-trip on obvious garbage input.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the voice key to use for synthesis. Falls back to 'katie'
 * (→ OpenAI alloy) when the interviewer's stored voice_id is unrecognised
 * so playback never 500s on a stale config.
 */
function resolveVoiceKey(storedVoiceId: string | undefined, messageId: string): string {
  if (!storedVoiceId) return 'katie';
  if (storedVoiceId in OPENAI_VOICES) return storedVoiceId;
  console.warn(
    `[TTS] interviewer voice_id "${storedVoiceId}" not in OPENAI_VOICES (message ${messageId}); falling back to katie`,
  );
  return 'katie';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 },
      );
    }

    if (!isOpenAITTSConfigured()) {
      console.error('[TTS] OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Configuration error', message: 'TTS service not configured' },
        { status: 503 },
      );
    }

    // Voice mode is gated to purchasers.
    const subscription = await getSubscriptionStatus();
    if (!subscription.hasPurchased) {
      return NextResponse.json(
        { error: 'Purchase required', message: 'Voice mode is available after purchasing interview credits' },
        { status: 403 },
      );
    }

    // Rate-limit per user. OpenAI bills per character; a replay loop is
    // bounded here before the DB lookup happens.
    const rl = await checkRateLimit('tts', user.id);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit', message: 'Too many voice requests. Please wait a moment.' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const body = (await request.json().catch(() => null)) as TTSRequest | null;
    const messageId = body?.message_id;

    if (typeof messageId !== 'string' || !UUID_PATTERN.test(messageId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'message_id is required and must be a UUID' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: message, error: messageError } = await supabase
      .from('interview_messages')
      .select('id, content, role, session_id, interviewer_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Not found', message: 'Message not found' },
        { status: 404 },
      );
    }

    // Only interviewer-authored messages may be synthesised.
    if (message.role !== 'interviewer') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only interviewer messages can be synthesised' },
        { status: 403 },
      );
    }

    // Verify session ownership. Return 404 (not 403) on a foreign session
    // to avoid leaking which session IDs exist.
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('id, user_id, interviewer_id, voice_enabled')
      .eq('id', message.session_id)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Message not found' },
        { status: 404 },
      );
    }

    if (!session.voice_enabled) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Voice mode is not enabled for this session' },
        { status: 403 },
      );
    }

    // Panel mode: each message has its own interviewer_id.
    // Single mode: fall back to the session's lead interviewer_id.
    const effectiveInterviewerId = message.interviewer_id ?? session.interviewer_id;

    if (!effectiveInterviewerId) {
      return NextResponse.json(
        { error: 'Invalid state', message: 'No interviewer associated with this message' },
        { status: 422 },
      );
    }

    const { data: interviewer, error: interviewerError } = await supabase
      .from('interviewers')
      .select('id, user_id, voice_config')
      .eq('id', effectiveInterviewerId)
      .eq('user_id', user.id)
      .single();

    if (interviewerError || !interviewer) {
      return NextResponse.json(
        { error: 'Not found', message: 'Interviewer not found' },
        { status: 404 },
      );
    }

    const voiceConfig = (interviewer.voice_config ?? null) as VoiceConfig | null;
    const selectedVoiceKey = resolveVoiceKey(voiceConfig?.voice_id, message.id);
    // voice_config.speed is stored as a numeric value (e.g. 1.0).
    // OpenAI accepts 0.25–4.0; we pass it through and let generateSpeechStream clamp it.
    const selectedSpeed = typeof voiceConfig?.speed === 'number' ? voiceConfig.speed : 1.0;

    const content = message.content?.trim() ?? '';
    if (content.length === 0) {
      return NextResponse.json(
        { error: 'Invalid state', message: 'Message has no content to synthesise' },
        { status: 422 },
      );
    }

    // OpenAI hard limit is 4 096 characters. generateSpeechStream truncates,
    // but we still refuse absurdly large messages (a server bug, not user
    // error) so the caller is not silently served a partial audio clip.
    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'Server error', message: 'Stored message exceeds the synthesis length limit' },
        { status: 500 },
      );
    }

    // Stream the OpenAI audio response straight to the client instead of
    // buffering with arrayBuffer(). The browser's MediaSource pipeline (see
    // components/interview/interview-chat.tsx → handleSpeakInterviewerMessage)
    // begins playback as soon as the first chunk arrives, dropping
    // time-to-first-audio from ~4-8 s (whole utterance) to ~1-2 s (first
    // chunk). Sentence-level prosody is preserved because OpenAI still
    // synthesises the entire utterance as one request — only the transport
    // is chunked.
    //
    // Content-Length is intentionally omitted: a streamed body uses chunked
    // transfer encoding and the total byte count is unknown until the
    // OpenAI stream completes. X-Character-Count / X-Estimated-Duration
    // carry the analytics metadata the client previously read from headers.
    const result = await generateSpeechStream({
      text: content,
      voiceKey: selectedVoiceKey,
      speed: selectedSpeed,
    });

    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'no-cache',
        'X-Character-Count': result.characterCount.toString(),
        'X-Estimated-Duration': result.estimatedDuration.toFixed(2),
      },
    });

  } catch (error) {
    console.error('[TTS] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Invalid OpenAI API key')) {
        return NextResponse.json(
          { error: 'Configuration error', message: 'TTS service authentication failed' },
          { status: 503 },
        );
      }
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit', message: 'Too many requests. Please try again later.' },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: 'TTS error', message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Server error', message: 'Failed to generate speech' },
      { status: 500 },
    );
  }
}

// GET endpoint to list available voices. Used by the voice picker.
export function GET(): NextResponse {
  const voiceList = Object.entries(OPENAI_VOICES).map(([key, voice]) => ({
    id: key,
    openAIId: voice.id,
    name: voice.name,
    description: voice.description,
    gender: voice.gender,
    personality: voice.personality,
  }));

  return NextResponse.json({
    provider: 'openai',
    model: 'tts-1',
    voices: voiceList,
    defaultVoice: 'katie',
    speedOptions: { min: 0.25, max: 4.0, default: 1.0 },
    maxCharacters: 4096,
    features: {
      streaming: true,
      lowLatency: true,
      timeToFirstAudio: 'first chunk ~500-1000ms (chunked transfer)',
    },
  });
}
