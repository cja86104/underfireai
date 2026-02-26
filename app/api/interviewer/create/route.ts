import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
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
  Json,
  Database,
} from '@/types/database';

interface CreateCustomInterviewerRequest {
  name: string;
  interview_type: InterviewType;
  archetype: InterviewerArchetype;
  company_style: CompanyStyle | null;
  role_focus: string | null;
  difficulty_level: number;
  voice_id: string;
  personality: PersonalityBase;
  communication_style: CommunicationStyle;
  question_patterns: QuestionPatterns;
  red_flags: string[];
  green_flags: string[];
  pet_peeves: string[];
  favorite_topics: string[];
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

const VALID_INTERVIEW_TYPES: InterviewType[] = [
  'behavioral', 'technical', 'case', 'hr', 'panel', 'phone_screen',
];

const VALID_COMPANY_STYLES: CompanyStyle[] = [
  'faang', 'startup', 'consulting', 'enterprise', 'agency', 'government',
];

const VALID_COMMUNICATION_STYLES: CommunicationStyle['style'][] = [
  'direct', 'probing', 'supportive', 'challenging',
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const subscription = await getSubscriptionStatus();

    if (subscription.tier !== 'premium') {
      return NextResponse.json(
        {
          error: 'Premium required',
          message: 'Custom Interviewer Creator requires a Premium subscription.',
        },
        { status: 403 }
      );
    }

    const body = await request.json() as CreateCustomInterviewerRequest;

    // ── Validate required fields ────────────────────────────────────────────
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Interviewer name is required' },
        { status: 400 }
      );
    }

    if (body.name.trim().length > 80) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Name must be 80 characters or fewer' },
        { status: 400 }
      );
    }

    if (!VALID_INTERVIEW_TYPES.includes(body.interview_type)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid interview type' },
        { status: 400 }
      );
    }

    const validArchetypes = Object.keys(INTERVIEWER_ARCHETYPES) as InterviewerArchetype[];
    if (!validArchetypes.includes(body.archetype)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid archetype' },
        { status: 400 }
      );
    }

    if (body.company_style !== null && !VALID_COMPANY_STYLES.includes(body.company_style)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid company style' },
        { status: 400 }
      );
    }

    const difficultyLevel = Math.min(10, Math.max(1, Math.round(body.difficulty_level ?? 5)));

    // ── Validate personality sliders ────────────────────────────────────────
    const personalityKeys: (keyof PersonalityBase)[] = [
      'directness', 'depth_preference', 'warmth', 'patience', 'technical_focus', 'skepticism',
    ];
    for (const key of personalityKeys) {
      if (typeof body.personality?.[key] !== 'number') {
        return NextResponse.json(
          { error: 'Validation error', message: `Personality trait "${key}" must be a number` },
          { status: 400 }
        );
      }
    }

    // ── Validate communication style ────────────────────────────────────────
    if (!VALID_COMMUNICATION_STYLES.includes(body.communication_style?.style)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid communication style' },
        { status: 400 }
      );
    }

    // ── Validate voice ──────────────────────────────────────────────────────
    const validVoice = VOICE_OPTIONS.find(v => v.id === body.voice_id);
    if (!validVoice) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid voice selection' },
        { status: 400 }
      );
    }

    // ── Clamp all personality values ────────────────────────────────────────
    const personality: PersonalityBase = {
      directness: clamp(body.personality.directness),
      depth_preference: clamp(body.personality.depth_preference),
      warmth: clamp(body.personality.warmth),
      patience: clamp(body.personality.patience),
      technical_focus: clamp(body.personality.technical_focus),
      skepticism: clamp(body.personality.skepticism),
    };

    const communicationStyle: CommunicationStyle = {
      style: body.communication_style.style,
      formality: clamp(body.communication_style.formality),
      verbosity: clamp(body.communication_style.verbosity),
    };

    const questionPatterns: QuestionPatterns = {
      follow_up_tendency: clamp(body.question_patterns.follow_up_tendency),
      depth_preference: clamp(body.question_patterns.depth_preference),
      curveball_frequency: clamp(body.question_patterns.curveball_frequency),
    };

    const archetypeData = INTERVIEWER_ARCHETYPES[body.archetype];

    // ── Generate AI backstory ───────────────────────────────────────────────
    const backstory = await generateBackstory({
      archetypeId: body.archetype,
      archetypeName: archetypeData.name,
      archetypeDescription: archetypeData.description,
      interviewType: body.interview_type,
      companyStyle: body.company_style,
      roleTarget: body.role_focus ?? null,
      interviewerName: body.name.trim(),
    });

    const voiceConfig: VoiceConfig = {
      voice_id: validVoice.id,
      speed: 1.0,
      pitch: 1.0,
      tts_enabled: true,
    };

    const supabase = await createClient();

    // ── Insert interviewer record ───────────────────────────────────────────
    const { data: newInterviewer, error: interviewerError } = await supabase
      .from('interviewers')
      .insert({
        user_id: user.id,
        name: body.name.trim(),
        interview_type: body.interview_type,
        company_style: body.company_style,
        role_focus: body.role_focus?.trim() ?? null,
        backstory,
        personality_base: personality as unknown as Json,
        difficulty_level: difficultyLevel,
        is_custom: true,
        current_mood: {
          current: 'neutral' as const,
          intensity: 50,
          triggers: [],
        } as unknown as Json,
        voice_config: voiceConfig as unknown as Json,
      })
      .select('id')
      .single();

    if (interviewerError || !newInterviewer) {
      console.error('Error creating custom interviewer:', interviewerError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to save interviewer' },
        { status: 500 }
      );
    }

    // ── Insert personality record ───────────────────────────────────────────
    const personalityInsert: Database['public']['Tables']['interviewer_personality']['Insert'] = {
      interviewer_id: newInterviewer.id,
      communication_style: communicationStyle as unknown as Json,
      question_patterns: questionPatterns as unknown as Json,
      red_flags: body.red_flags.filter(f => f.trim().length > 0),
      green_flags: body.green_flags.filter(f => f.trim().length > 0),
      pet_peeves: body.pet_peeves.filter(f => f.trim().length > 0),
      favorite_topics: body.favorite_topics.filter(f => f.trim().length > 0),
    };

    const { error: personalityError } = await supabase
      .from('interviewer_personality')
      .insert(personalityInsert);

    if (personalityError) {
      console.error('Error creating custom interviewer personality:', personalityError);
      // Non-fatal — the interviewer row is already saved. Log and continue.
    }

    return NextResponse.json({
      interviewer_id: newInterviewer.id,
      message: 'Custom interviewer created successfully',
    });
  } catch (error) {
    console.error('Error in create custom interviewer:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
