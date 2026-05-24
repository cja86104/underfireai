import { NextResponse } from 'next/server';
import { VOICE_OPTIONS, INTERVIEWER_ARCHETYPES } from '@/types/interviewer';

/**
 * GET /api/voices
 *
 * Returns available TTS voices with metadata.
 * Public endpoint - no auth required.
 */
export function GET(): NextResponse {
  const voices = VOICE_OPTIONS.map((voice) => ({
    id: voice.id,
    openAIId: voice.openAIId,
    name: voice.name,
    description: voice.description,
    gender: voice.gender,
    tone: voice.tone,
    suggestedFor: voice.suggestedFor,
    suggestedForNames: voice.suggestedFor.map((archetype) =>
      INTERVIEWER_ARCHETYPES[archetype]?.name || archetype
    ),
  }));

  const byTone = voices.reduce<Record<string, string[]>>((acc, voice) => {
    const tone = voice.tone;
    if (!acc[tone]) acc[tone] = [];
    acc[tone].push(voice.id);
    return acc;
  }, {});

  const byGender = voices.reduce<Record<string, string[]>>((acc, voice) => {
    const gender = voice.gender;
    if (!acc[gender]) acc[gender] = [];
    acc[gender].push(voice.id);
    return acc;
  }, {});

  return NextResponse.json({
    provider: 'openai',
    model: 'tts-1',
    voices,
    defaultVoice: 'katie',
    groupings: {
      byTone,
      byGender,
    },
    totalVoices: voices.length,
    features: {
      streaming: false,
      lowLatency: true,
      timeToFirstAudio: '500-800ms',
      maxCharacters: 4096,
      supportedSpeeds: { min: 0.25, max: 4.0, default: 1.0 },
    },
  });
}
