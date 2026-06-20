import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { transcribeAudio, isOpenAISTTConfigured, MAX_AUDIO_BYTES } from '@/lib/stt/openai-stt';

/**
 * Mobile voice-input transcription.
 *
 * The mobile client (components/interview/voice-mode.tsx) records the
 * candidate's answer with getUserMedia + MediaRecorder and POSTs the audio
 * here as multipart/form-data (field name `audio`). We transcribe it with
 * OpenAI Whisper and return the text, which the client feeds into the normal
 * answer-submit flow.
 *
 * This exists because iOS Safari's webkitSpeechRecognition never opens the
 * real microphone (it uses Apple Dictation) and is unreliable. Desktop keeps
 * using webkitSpeechRecognition and never calls this route.
 *
 * Security/quotas mirror app/api/tts/route.ts: auth -> OpenAI config check ->
 * purchase gate -> per-session rate limit -> session-ownership check.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Container formats MediaRecorder emits across browsers (codecs suffix is
// stripped before the check): iOS Safari -> audio/mp4, Android Chrome ->
// audio/webm, plus common fallbacks Whisper accepts.
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/mpga',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 },
      );
    }

    if (!isOpenAISTTConfigured()) {
      console.error('[STT] OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Configuration error', message: 'Speech-to-text service not configured' },
        { status: 503 },
      );
    }

    // Voice mode (including mic input) is gated to purchasers, same as TTS.
    const subscription = await getSubscriptionStatus();
    if (!subscription.hasPurchased) {
      return NextResponse.json(
        { error: 'Purchase required', message: 'Voice mode is available after purchasing interview credits' },
        { status: 403 },
      );
    }

    if (!UUID_PATTERN.test(sessionId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'sessionId must be a UUID' },
        { status: 400 },
      );
    }

    // Rate-limit per session — a stuck/looping recorder is bounded before the
    // paid OpenAI call. Scoped by sessionId like the chat route.
    const rl = await checkRateLimit('stt', sessionId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit', message: 'Too many voice requests. Please wait a moment.' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    // Verify session ownership. Return 404 (not 403) on a foreign/absent
    // session so we never leak which session IDs exist.
    const supabase = await createClient();
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('id, user_id, voice_enabled, status')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found' },
        { status: 404 },
      );
    }

    if (!session.voice_enabled) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Voice mode is not enabled for this session' },
        { status: 403 },
      );
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Conflict', message: 'This interview is not in progress' },
        { status: 409 },
      );
    }

    // Parse the multipart upload.
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Validation error', message: 'Expected multipart/form-data with an audio file' },
        { status: 400 },
      );
    }

    const audio = formData.get('audio');
    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'audio file is required' },
        { status: 400 },
      );
    }

    if (audio.size === 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'audio file is empty' },
        { status: 400 },
      );
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: 'Payload too large', message: 'Audio exceeds the size limit. Record a shorter answer.' },
        { status: 413 },
      );
    }

    // Normalise the MIME type — browsers append codecs, e.g.
    // "audio/webm;codecs=opus". Validate the base container type.
    const baseType = (audio.type || '').split(';')[0].trim().toLowerCase();
    if (baseType && !ALLOWED_AUDIO_TYPES.has(baseType)) {
      return NextResponse.json(
        { error: 'Unsupported media type', message: `Unsupported audio format: ${baseType}` },
        { status: 415 },
      );
    }

    const { text } = await transcribeAudio({ file: audio, language: 'en' });

    return NextResponse.json(
      { transcript: text },
      { status: 200, headers: rateLimitHeaders(rl) },
    );
  } catch (error) {
    console.error('[STT] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Invalid OpenAI API key')) {
        return NextResponse.json(
          { error: 'Configuration error', message: 'Speech-to-text authentication failed' },
          { status: 503 },
        );
      }
      if (error.message.toLowerCase().includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit', message: 'Too many requests. Please try again later.' },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: 'Transcription error', message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Server error', message: 'Failed to transcribe audio' },
      { status: 500 },
    );
  }
}
