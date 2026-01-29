/**
 * UnderFireAI - OpenAI TTS Helper
 *
 * Reusable text-to-speech synthesis using OpenAI's TTS API.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const VALID_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
export type Voice = typeof VALID_VOICES[number];

export const VOICE_LIST = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm, conversational' },
  { id: 'fable', name: 'Fable', description: 'Expressive, British accent' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly, energetic' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear, professional' },
] as const;

/**
 * Synthesize speech from text using OpenAI TTS.
 * Returns a Buffer of MP3 audio data.
 */
export async function synthesizeSpeech(
  text: string,
  voice: Voice = 'alloy',
  speed: number = 1.0
): Promise<Buffer> {
  const selectedVoice: Voice = VALID_VOICES.includes(voice) ? voice : 'alloy';
  const selectedSpeed = Math.max(0.25, Math.min(4.0, speed));

  const mp3Response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: selectedVoice,
    input: text,
    speed: selectedSpeed,
    response_format: 'mp3',
  });

  return Buffer.from(await mp3Response.arrayBuffer());
}
