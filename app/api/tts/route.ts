import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import {
  generateSpeech,
  CARTESIA_VOICES,
  type TTSSpeed,
  isCartesiaConfigured,
} from '@/lib/tts/cartesia-tts';

interface TTSRequest {
  text: string;
  voice?: string;
  speed?: TTSSpeed;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    // Check if Cartesia is configured
    if (!isCartesiaConfigured()) {
      console.error('CARTESIA_API_KEY not configured');
      return NextResponse.json(
        { error: 'Configuration error', message: 'TTS service not configured' },
        { status: 503 }
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

    const body = await request.json() as TTSRequest;
    const { text, voice = 'katie', speed = 'normal' } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Text is required' },
        { status: 400 }
      );
    }

    // Validate text length (Cartesia limit is 10,000 chars)
    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Text too long (max 10,000 characters)' },
        { status: 400 }
      );
    }

    // Validate speed
    const validSpeeds: TTSSpeed[] = ['slow', 'normal', 'fast'];
    const selectedSpeed = validSpeeds.includes(speed) ? speed : 'normal';

    // Generate speech using Cartesia
    const result = await generateSpeech({
      text,
      voiceId: voice,
      speed: selectedSpeed,
    });

    // Return audio as response
    const uint8 = new Uint8Array(result.audioBuffer);
    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Length': result.audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
        'X-Character-Count': result.characterCount.toString(),
        'X-Estimated-Duration': result.estimatedDuration.toFixed(2),
      },
    });

  } catch (error) {
    console.error('TTS Error:', error);

    if (error instanceof Error) {
      // Handle specific Cartesia errors
      if (error.message.includes('Invalid Cartesia API key')) {
        return NextResponse.json(
          { error: 'Configuration error', message: 'TTS service authentication failed' },
          { status: 503 }
        );
      }

      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit', message: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'TTS error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Server error', message: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available voices
export function GET(): NextResponse {
  const voiceList = Object.entries(CARTESIA_VOICES).map(([key, voice]) => ({
    id: key,
    cartesiaId: voice.id,
    name: voice.name,
    description: voice.description,
    gender: voice.gender,
    personality: voice.personality,
  }));

  return NextResponse.json({
    provider: 'cartesia',
    model: 'sonic-3',
    voices: voiceList,
    defaultVoice: 'katie',
    speedOptions: ['slow', 'normal', 'fast'],
    maxCharacters: 10000,
    features: {
      streaming: true,
      lowLatency: true,
      timeToFirstAudio: '40-90ms',
    },
  });
}
