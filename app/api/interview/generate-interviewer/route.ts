import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { generateBackstory } from '@/lib/ai/backstory-generator';
import {
  INTERVIEWER_ARCHETYPES,
  VOICE_OPTIONS,
  type InterviewerArchetype,
} from '@/types/interviewer';
import type {
  InterviewType,
  CompanyStyle,
  PersonalityBase,
  CommunicationStyle,
  QuestionPatterns,
  VoiceConfig,
} from '@/types/database';

// Curated interviewer names
const INTERVIEWER_NAMES = {
  masculine: [
    'James Chen', 'Michael Torres', 'David Kim', 'Robert Singh',
    'William Park', 'Daniel Lee', 'Christopher Wu', 'Marcus Johnson',
    'Alexander Patel', 'Jonathan Wright', 'Nathan Brooks', 'Ryan Mitchell',
  ],
  feminine: [
    'Sarah Mitchell', 'Emily Rodriguez', 'Jennifer Chang', 'Amanda Foster',
    'Rachel Kim', 'Michelle Liu', 'Katherine Hayes', 'Lauren Thompson',
    'Victoria Chen', 'Rebecca Martinez', 'Samantha Lee', 'Nicole Adams',
  ],
  neutral: [
    'Alex Morgan', 'Jordan Taylor', 'Casey Rivera', 'Morgan Ellis',
    'Riley Chen', 'Cameron Brooks', 'Quinn Foster', 'Avery Kim',
  ],
};

interface GenerateInterviewerRequest {
  interviewType: InterviewType;
  companyStyle?: CompanyStyle;
  roleTarget?: string;
  difficultyLevel: number;
  archetypeHint?: InterviewerArchetype;
  excludeArchetypes?: InterviewerArchetype[];
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

    const body = await request.json() as GenerateInterviewerRequest;
    const {
      interviewType,
      companyStyle,
      roleTarget,
      difficultyLevel,
      archetypeHint,
      excludeArchetypes = [],
    } = body;

    // Validate required fields
    if (!interviewType) {
      return NextResponse.json(
        { error: 'Validation error', message: 'interviewType is required' },
        { status: 400 }
      );
    }

    const validInterviewTypes: InterviewType[] = [
      'behavioral', 'technical', 'case', 'hr', 'panel', 'phone_screen'
    ];
    if (!validInterviewTypes.includes(interviewType)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid interview type' },
        { status: 400 }
      );
    }

    const difficulty = Math.min(10, Math.max(1, difficultyLevel || 5));

    // Select archetype
    let archetypeKey: InterviewerArchetype;
    const archetypeKeys = Object.keys(INTERVIEWER_ARCHETYPES) as InterviewerArchetype[];
    const availableArchetypes = archetypeKeys.filter(k => !excludeArchetypes.includes(k));

    if (availableArchetypes.length === 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'All archetypes excluded' },
        { status: 400 }
      );
    }

    if (archetypeHint && availableArchetypes.includes(archetypeHint)) {
      archetypeKey = archetypeHint;
    } else {
      archetypeKey = availableArchetypes[Math.floor(Math.random() * availableArchetypes.length)];
    }

    const archetypeData = INTERVIEWER_ARCHETYPES[archetypeKey];

    // Apply difficulty modifiers to personality
    const difficultyModifier = (difficulty - 5) * 5; // -20 to +20
    const personality: PersonalityBase = {
      directness: clamp(archetypeData.basePersonality.directness + difficultyModifier),
      depth_preference: clamp(archetypeData.basePersonality.depth_preference + difficultyModifier),
      warmth: clamp(archetypeData.basePersonality.warmth - difficultyModifier), // harder = less warm
      patience: clamp(archetypeData.basePersonality.patience - difficultyModifier), // harder = less patient
      technical_focus: clamp(archetypeData.basePersonality.technical_focus + (difficultyModifier / 2)),
      skepticism: clamp(archetypeData.basePersonality.skepticism + difficultyModifier),
    };

    const communicationStyle: CommunicationStyle = {
      style: archetypeData.communicationStyle.style,
      formality: clamp(archetypeData.communicationStyle.formality + (difficultyModifier / 2)),
      verbosity: archetypeData.communicationStyle.verbosity,
    };

    const questionPatterns: QuestionPatterns = {
      follow_up_tendency: clamp(archetypeData.questionPatterns.follow_up_tendency + (difficultyModifier / 2)),
      depth_preference: clamp(archetypeData.questionPatterns.depth_preference + difficultyModifier),
      curveball_frequency: clamp(archetypeData.questionPatterns.curveball_frequency + difficultyModifier),
    };

    // Select voice based on archetype suggestions
    const suggestedVoiceId = archetypeData.suggestedVoices[
      Math.floor(Math.random() * archetypeData.suggestedVoices.length)
    ] ?? 'katie';

    const voiceOption = VOICE_OPTIONS.find(v => v.id === suggestedVoiceId) ?? VOICE_OPTIONS[0];

    const voiceConfig: VoiceConfig = {
      voice_id: voiceOption.id,
      speed: 1.0,
      pitch: 1.0,
      tts_enabled: true,
    };

    // Select name based on voice gender
    const namePool = voiceOption.gender === 'masculine'
      ? INTERVIEWER_NAMES.masculine
      : voiceOption.gender === 'feminine'
      ? INTERVIEWER_NAMES.feminine
      : INTERVIEWER_NAMES.neutral;

    const interviewerName = namePool[Math.floor(Math.random() * namePool.length)];

    // Generate backstory
    const backstory = await generateBackstory({
      archetypeId: archetypeKey,
      archetypeName: archetypeData.name,
      archetypeDescription: archetypeData.description,
      interviewType,
      companyStyle: companyStyle ?? null,
      roleTarget: roleTarget ?? null,
      interviewerName,
    });

    return NextResponse.json({
      interviewer: {
        name: interviewerName,
        archetype: archetypeKey,
        archetypeName: archetypeData.name,
        archetypeDescription: archetypeData.description,
        backstory,
        personality,
        communicationStyle,
        questionPatterns,
        voiceConfig,
        difficultyLevel: difficulty,
        effectiveDifficulty: difficulty + archetypeData.difficultyModifier,
      },
      personality: {
        redFlags: archetypeData.defaultRedFlags,
        greenFlags: archetypeData.defaultGreenFlags,
        petPeeves: archetypeData.defaultPetPeeves,
        favoriteTopics: archetypeData.favoriteTopics,
      },
    });

  } catch (error) {
    console.error('Error generating interviewer:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to generate interviewer' },
      { status: 500 }
    );
  }
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
