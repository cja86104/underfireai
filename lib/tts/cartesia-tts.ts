/**
 * UnderFireAI - Cartesia Sonic TTS Client
 *
 * Cartesia Sonic 3 Features:
 * - 40ms time-to-first-audio (Turbo) / 90ms (Standard)
 * - Streaming support for real-time playback
 * - 42 languages supported
 * - Volume, speed, and emotion controls
 * - Natural laughter through [laughter] tags
 *
 * Pricing: ~$0.038 per 1,000 characters
 * Much faster than OpenAI TTS with streaming support!
 */

const CARTESIA_API_URL = 'https://api.cartesia.ai/tts/bytes';
const CARTESIA_VERSION = '2025-04-16';

/**
 * Available Cartesia voices for interviewers
 * Selected for professional, clear speech suitable for interview scenarios
 */
export const CARTESIA_VOICES = {
  // Professional/Agent voices (stable, realistic)
  katie: {
    id: 'f786b574-daa5-4673-aa0c-cbe3e8534c02',
    name: 'Katie',
    description: 'Professional, clear female voice',
    gender: 'female' as const,
    personality: 'Professional, composed, articulate',
    previewText: "Hello, I'm Katie. Let's begin the interview. Tell me about yourself.",
  },
  kiefer: {
    id: '228fca29-3a0a-435c-8728-5cb483251068',
    name: 'Kiefer',
    description: 'Professional male voice',
    gender: 'male' as const,
    personality: 'Confident, direct, business-like',
    previewText: "Hi there, I'm Kiefer. I'll be conducting your interview today.",
  },
  // Emotive voices (more expressive, good for varied interviewer personalities)
  tessa: {
    id: '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
    name: 'Tessa',
    description: 'Expressive, warm female voice',
    gender: 'female' as const,
    personality: 'Warm, engaging, encouraging',
    previewText: "Hi! I'm Tessa. I'm excited to learn more about your experience today.",
  },
  kyle: {
    id: 'c961b81c-a935-4c17-bfb3-ba2239de8c2f',
    name: 'Kyle',
    description: 'Expressive male voice',
    gender: 'male' as const,
    personality: 'Dynamic, energetic, thoughtful',
    previewText: "Hey, I'm Kyle. Looking forward to our conversation today.",
  },
  // Additional voices for variety
  leo: {
    id: '040132fe-5f8f-4e9f-a315-18a5c8b8c445',
    name: 'Leo',
    description: 'Deep, authoritative male voice',
    gender: 'male' as const,
    personality: 'Authoritative, serious, senior executive',
    previewText: "Good morning. I'm Leo. Let's discuss your qualifications.",
  },
  maya: {
    id: 'c58c5a0c-4ed8-4c67-aec3-bb6fef4b4c02',
    name: 'Maya',
    description: 'Friendly, approachable female voice',
    gender: 'female' as const,
    personality: 'Friendly, approachable, supportive',
    previewText: "Hey there! I'm Maya. Don't be nervous - just be yourself!",
  },
} as const;

export type CartesiaVoiceId = keyof typeof CARTESIA_VOICES;

/**
 * Speed options for TTS
 */
export type TTSSpeed = 'slow' | 'normal' | 'fast';

/**
 * Voice configuration stored in database
 */
export interface VoiceConfig {
  provider: 'cartesia';
  voiceId: string;
  speed?: TTSSpeed;
}

/**
 * Options for generating speech
 */
export interface GenerateSpeechOptions {
  text: string;
  voiceId: CartesiaVoiceId | string;
  speed?: TTSSpeed;
  language?: string;
}

/**
 * Response from speech generation
 */
export interface SpeechResponse {
  audioBuffer: ArrayBuffer;
  contentType: string;
  characterCount: number;
  estimatedDuration: number;
}

/**
 * Check if Cartesia API is configured
 */
export function isCartesiaConfigured(): boolean {
  return !!process.env.CARTESIA_API_KEY;
}

/**
 * Get voice by ID (either key name or raw ID)
 */
export function getVoice(voiceId: CartesiaVoiceId | string): typeof CARTESIA_VOICES[CartesiaVoiceId] | null {
  // Check if it's a key name
  if (voiceId in CARTESIA_VOICES) {
    return CARTESIA_VOICES[voiceId as CartesiaVoiceId];
  }
  // Check if it's a raw ID
  for (const voice of Object.values(CARTESIA_VOICES)) {
    if (voice.id === voiceId) {
      return voice;
    }
  }
  return null;
}

/**
 * Get the raw Cartesia voice ID from either a key name or raw ID
 */
function resolveVoiceId(voiceId: CartesiaVoiceId | string): string {
  // If it's a known key, get the ID
  if (voiceId in CARTESIA_VOICES) {
    return CARTESIA_VOICES[voiceId as CartesiaVoiceId].id;
  }
  // Otherwise assume it's already a raw ID
  return voiceId;
}

/**
 * Convert speed option to numeric value
 * Cartesia uses numeric speed: 0.5 (slow) to 2.0 (fast), default 1.0
 */
function speedToNumeric(speed: TTSSpeed): number {
  switch (speed) {
    case 'slow':
      return 0.8;
    case 'fast':
      return 1.2;
    case 'normal':
    default:
      return 1.0;
  }
}

/**
 * Generate speech audio from text using Cartesia Sonic TTS
 * Returns MP3 audio buffer
 */
export async function generateSpeech(
  options: GenerateSpeechOptions
): Promise<SpeechResponse> {
  const {
    text,
    voiceId,
    speed = 'normal',
    language = 'en',
  } = options;

  const apiKey = process.env.CARTESIA_API_KEY;

  if (!apiKey) {
    throw new Error('CARTESIA_API_KEY environment variable is not set');
  }

  const resolvedVoiceId = resolveVoiceId(voiceId);

  // Cartesia has a 10,000 character limit per request
  const MAX_CHARS = 10000;
  const truncatedText = text.slice(0, MAX_CHARS);

  try {
    const response = await fetch(CARTESIA_API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Cartesia-Version': CARTESIA_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_id: 'sonic-3',
        transcript: truncatedText,
        voice: {
          mode: 'id',
          id: resolvedVoiceId,
        },
        language,
        output_format: {
          container: 'mp3',
          bit_rate: 128000,
        },
        // Generation config for Sonic 3
        generation_config: {
          speed: speedToNumeric(speed),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cartesia TTS Error:', response.status, errorText);

      if (response.status === 401) {
        throw new Error('Invalid Cartesia API key');
      }

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (response.status === 400) {
        throw new Error(`Bad request: ${errorText}`);
      }

      throw new Error(`TTS generation failed: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();

    // Estimate duration based on character count and speed
    // Average speaking rate is ~150 words per minute, ~5 chars per word
    // So roughly 750 chars per minute = 12.5 chars per second at normal speed
    const speedMultiplier = speedToNumeric(speed);
    const estimatedDuration = (truncatedText.length / 12.5) / speedMultiplier;

    return {
      audioBuffer,
      contentType: 'audio/mpeg',
      characterCount: truncatedText.length,
      estimatedDuration,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('TTS generation error:', error.message);
      throw error;
    }
    throw new Error('Unknown error during TTS generation');
  }
}

/**
 * Generate a voice preview for the given voice ID
 */
export async function generateVoicePreview(
  voiceId: CartesiaVoiceId
): Promise<SpeechResponse> {
  const voice = CARTESIA_VOICES[voiceId];

  if (!voice) {
    throw new Error(`Invalid voice ID: ${voiceId}`);
  }

  return generateSpeech({
    text: voice.previewText,
    voiceId,
    speed: 'normal',
  });
}

/**
 * Get voices available for a subscription tier
 */
export function getVoicesForTier(tier: string): typeof CARTESIA_VOICES {
  // Free users get no voice access
  if (tier === 'free') {
    return {} as typeof CARTESIA_VOICES;
  }

  // All paid tiers get all voices
  return CARTESIA_VOICES;
}

/**
 * Get voice usage limits by tier (characters per month)
 */
export function getVoiceLimitForTier(tier: string): number {
  switch (tier) {
    case 'premium':
      return 500000; // ~250 minutes
    case 'pro':
      return 200000; // ~100 minutes
    default:
      return 0; // No voice for free tier
  }
}

/**
 * Estimate cost for character count
 */
export function estimateVoiceCost(characterCount: number): number {
  // Cartesia pricing: ~$0.038 per 1,000 characters
  return (characterCount / 1000) * 0.038;
}

/**
 * Check if user has voice access based on tier
 */
export function hasVoiceAccess(tier: string): boolean {
  return ['pro', 'premium'].includes(tier);
}

/**
 * Validate a voice configuration object
 */
export function isValidVoiceConfig(config: unknown): config is VoiceConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const c = config as Record<string, unknown>;

  if (c.provider !== 'cartesia') {
    return false;
  }

  if (typeof c.voiceId !== 'string' || c.voiceId.length === 0) {
    return false;
  }

  // Validate voice ID exists
  const voice = getVoice(c.voiceId as string);
  if (!voice) {
    return false;
  }

  if (c.speed !== undefined) {
    if (!['slow', 'normal', 'fast'].includes(c.speed as string)) {
      return false;
    }
  }

  return true;
}

/**
 * Create a default voice configuration
 */
export function createDefaultVoiceConfig(voiceId: CartesiaVoiceId = 'katie'): VoiceConfig {
  return {
    provider: 'cartesia',
    voiceId,
    speed: 'normal',
  };
}

/**
 * Map interviewer archetype to suggested voice
 */
export function getVoiceForArchetype(archetype: string): CartesiaVoiceId {
  const archetypeVoiceMap: Record<string, CartesiaVoiceId> = {
    skeptic: 'leo',
    griller: 'kiefer',
    friendly: 'maya',
    silentJudge: 'katie',
    rapidFire: 'kyle',
    cultureFit: 'tessa',
    technicalExpert: 'kiefer',
    executive: 'leo',
  };

  return archetypeVoiceMap[archetype] || 'katie';
}
