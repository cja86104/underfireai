import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Available voices from OpenAI TTS
const VALID_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
type Voice = typeof VALID_VOICES[number];

interface TTSRequest {
  text: string;
  voice?: Voice;
  speed?: number;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    // Check if user has voice mode access
    const subscription = await getSubscriptionStatus();
    if (subscription.tier === 'free') {
      return NextResponse.json(
        { error: 'Upgrade required', message: 'Voice mode requires Pro or Premium subscription' },
        { status: 403 }
      );
    }

    const body: TTSRequest = await request.json();
    const { text, voice = 'alloy', speed = 1.0 } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Text is required' },
        { status: 400 }
      );
    }

    // Validate text length (OpenAI limit is 4096 chars)
    if (text.length > 4096) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Text too long (max 4096 characters)' },
        { status: 400 }
      );
    }

    // Validate voice
    const selectedVoice: Voice = VALID_VOICES.includes(voice as Voice) ? voice : 'alloy';

    // Validate speed (0.25 to 4.0)
    const selectedSpeed = Math.max(0.25, Math.min(4.0, speed));

    // Generate speech using OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: selectedVoice,
      input: text,
      speed: selectedSpeed,
      response_format: 'mp3',
    });

    // Get the audio data as a buffer
    const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());

    // Return audio as response
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('TTS Error:', error);

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: 'TTS error', message: error.message },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Server error', message: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available voices
export async function GET() {
  return NextResponse.json({
    voices: [
      { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
      { id: 'echo', name: 'Echo', description: 'Warm, conversational' },
      { id: 'fable', name: 'Fable', description: 'Expressive, British accent' },
      { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative' },
      { id: 'nova', name: 'Nova', description: 'Friendly, energetic' },
      { id: 'shimmer', name: 'Shimmer', description: 'Clear, professional' },
    ],
    defaultVoice: 'alloy',
    speedRange: { min: 0.25, max: 4.0, default: 1.0 },
  });
}
