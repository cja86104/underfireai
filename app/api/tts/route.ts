import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import { synthesizeSpeech, VALID_VOICES, VOICE_LIST, type Voice } from '@/lib/tts/openai-tts';

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

    // Generate speech using extracted helper
    const audioBuffer = await synthesizeSpeech(text, voice, speed);

    // Return audio as response — use Uint8Array for NextResponse compatibility
    const uint8 = new Uint8Array(audioBuffer);
    return new NextResponse(uint8, {
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
    voices: VOICE_LIST,
    defaultVoice: 'alloy',
    speedRange: { min: 0.25, max: 4.0, default: 1.0 },
  });
}
