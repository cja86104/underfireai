import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import { INTERVIEWER_ARCHETYPES, type InterviewerArchetype } from '@/types/interviewer';
import { generateBackstory } from '@/lib/ai/backstory-generator';
import {
  SESSION_LENGTH_CONFIG as lengthConfig,
  type Database,
  type InterviewType,
  type CompanyStyle,
  type PersonalityBase,
  type Json,
  type SessionLength,
} from '@/types/database';

interface CreateInterviewRequest {
  interview_type: InterviewType;
  company_style: CompanyStyle;
  target_role: string | null;
  target_company: string | null;
  difficulty: number;
  use_voice_mode: boolean;
  interviewer_id: string | null;
  generate_new_interviewer: boolean;
  session_length: SessionLength;
  // ── Premium: Custom Scenario Builder ────────────────────────────────────────
  /**
   * One or two archetype keys to blend. When two keys are provided the
   * resulting personality is the element-wise average of both archetypes
   * (after the difficulty modifier is applied).
   */
  archetype_mix?: InterviewerArchetype[];
  /**
   * Behavioural modifiers forwarded to the AI prompt so they shape the
   * interviewer's conduct throughout the session.
   */
  constraints?: string[];
  /**
   * Explicit overrides applied on top of the computed personality.
   * Values are clamped to [0, 100].
   */
  trait_overrides?: Partial<PersonalityBase>;
}

// Generate a random interviewer name
function generateInterviewerName(): string {
  const firstNames = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
    'Cameron', 'Drew', 'Blake', 'Reese', 'Parker', 'Skyler', 'Jamie', 'Robin',
    'Sarah', 'Michael', 'Emily', 'David', 'Jennifer', 'James', 'Lisa', 'Robert',
  ];
  const lastNames = [
    'Chen', 'Patel', 'Williams', 'Garcia', 'Kim', 'Martinez', 'Thompson', 'Lee',
    'Anderson', 'Taylor', 'Brown', 'Johnson', 'Davis', 'Miller', 'Wilson', 'Moore',
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName}`;
}

/** Clamp a number to [0, 100]. */
function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Blend two personality objects by taking the element-wise average.
 * The difficulty modifier has already been applied to `base` before this runs.
 */
function blendPersonalities(base: PersonalityBase, other: PersonalityBase): PersonalityBase {
  return {
    directness:       clamp(Math.round((base.directness       + other.directness)       / 2)),
    depth_preference: clamp(Math.round((base.depth_preference + other.depth_preference) / 2)),
    warmth:           clamp(Math.round((base.warmth           + other.warmth)           / 2)),
    patience:         clamp(Math.round((base.patience         + other.patience)         / 2)),
    technical_focus:  clamp(Math.round((base.technical_focus  + other.technical_focus)  / 2)),
    skepticism:       clamp(Math.round((base.skepticism       + other.skepticism)       / 2)),
  };
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

    // Subscription check — needed both for the interview limit and the premium gate
    const subscription = await getSubscriptionStatus();

    if (!subscription.canStartInterview) {
      return NextResponse.json(
        { error: 'Limit reached', message: "You've used all your free interviews this month. Upgrade to continue." },
        { status: 403 }
      );
    }

    const body = await request.json() as CreateInterviewRequest;

    // ── Premium gate ─────────────────────────────────────────────────────────
    const hasPremiumFields =
      ((body.archetype_mix?.length ?? 0) > 0) ||
      ((body.constraints?.length ?? 0) > 0) ||
      (Object.keys(body.trait_overrides ?? {}).length > 0);

    if (hasPremiumFields && subscription.tier !== 'premium') {
      return NextResponse.json(
        {
          error: 'Premium required',
          message: 'Custom Scenario Builder requires a Premium subscription.',
        },
        { status: 403 }
      );
    }

    const {
      interview_type,
      company_style,
      target_role,
      target_company,
      difficulty,
      interviewer_id,
      generate_new_interviewer,
      session_length,
      archetype_mix   = [],
      constraints     = [],
      trait_overrides = {},
    } = body;

    // Get session length config for message limits
    const sessionConfig = lengthConfig[session_length] || lengthConfig.standard;

    // Validate required fields
    if (!interview_type) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Interview type is required' },
        { status: 400 }
      );
    }

    // Validate archetype_mix values
    const validArchetypes = Object.keys(INTERVIEWER_ARCHETYPES) as InterviewerArchetype[];
    for (const key of archetype_mix) {
      if (!validArchetypes.includes(key)) {
        return NextResponse.json(
          { error: 'Validation error', message: `Unknown archetype: ${key}` },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();
    let finalInterviewerId = interviewer_id;

    // Generate new interviewer if requested
    if (generate_new_interviewer || !interviewer_id) {
      const name = generateInterviewerName();

      // ── Archetype selection ───────────────────────────────────────────────
      // Premium: use the first key in archetype_mix as the primary archetype so
      // that red flags, green flags, etc. are rooted in one archetype.
      // Standard (and premium with no mix): random selection as before.
      const archetypeKeys = Object.keys(INTERVIEWER_ARCHETYPES) as InterviewerArchetype[];
      const archetypeKey: InterviewerArchetype =
        archetype_mix.length > 0
          ? archetype_mix[0]
          : archetypeKeys[Math.floor(Math.random() * archetypeKeys.length)];

      const archetypeData = INTERVIEWER_ARCHETYPES[archetypeKey];

      // ── Base personality with difficulty modifier ─────────────────────────
      const difficultyModifier = (difficulty - 5) * 5; // −20 to +20

      let personality: PersonalityBase = {
        directness:       clamp(archetypeData.basePersonality.directness       + difficultyModifier),
        depth_preference: clamp(archetypeData.basePersonality.depth_preference + difficultyModifier),
        warmth:           clamp(archetypeData.basePersonality.warmth           - difficultyModifier),
        patience:         clamp(archetypeData.basePersonality.patience         - difficultyModifier),
        technical_focus:  archetypeData.basePersonality.technical_focus,
        skepticism:       clamp(archetypeData.basePersonality.skepticism       + difficultyModifier),
      };

      // ── Premium: blend a second archetype ────────────────────────────────
      if (archetype_mix.length >= 2) {
        const secondKey = archetype_mix[1];
        const secondArchetype = INTERVIEWER_ARCHETYPES[secondKey];
        personality = blendPersonalities(personality, secondArchetype.basePersonality);
      }

      // ── Premium: apply explicit trait overrides ───────────────────────────
      const overrideEntries = Object.entries(trait_overrides) as [keyof PersonalityBase, number][];
      for (const [key, value] of overrideEntries) {
        if (typeof value === 'number') {
          (personality as unknown as Record<string, number>)[key] = clamp(value);
        }
      }

      // ── Generate AI backstory ─────────────────────────────────────────────
      const backstory = await generateBackstory({
        archetypeId:          archetypeKey,
        archetypeName:        archetypeData.name,
        archetypeDescription: archetypeData.description,
        interviewType:        interview_type,
        companyStyle:         company_style,
        roleTarget:           target_role,
        interviewerName:      name,
        constraints,
      });

      // Use primary archetype's suggested voice
      const voiceId = archetypeData.suggestedVoices[0] || 'katie';

      // Create interviewer
      const { data: newInterviewer, error: interviewerError } = await supabase
        .from('interviewers')
        .insert({
          user_id: user.id,
          name,
          interview_type,
          company_style,
          role_focus: target_role,
          backstory,
          personality_base: personality as unknown as Json,
          difficulty_level: difficulty,
          current_mood: {
            current:   'neutral' as const,
            intensity: 50,
            triggers:  [],
          } as unknown as Json,
          voice_config: {
            voice_id:    voiceId,
            speed:       1.0,
            pitch:       1.0,
            tts_enabled: body.use_voice_mode,
          } as unknown as Json,
        })
        .select('id')
        .single();

      if (interviewerError || !newInterviewer) {
        console.error('Error creating interviewer:', interviewerError);
        return NextResponse.json(
          { error: 'Database error', message: 'Failed to create interviewer' },
          { status: 500 }
        );
      }

      finalInterviewerId = newInterviewer.id;

      // Create interviewer personality record (non-fatal if it fails)
      const personalityInsert: Database['public']['Tables']['interviewer_personality']['Insert'] = {
        interviewer_id:    newInterviewer.id,
        communication_style: archetypeData.communicationStyle as unknown as Json,
        question_patterns:   archetypeData.questionPatterns   as unknown as Json,
        red_flags:           [...archetypeData.defaultRedFlags],
        green_flags:         [...archetypeData.defaultGreenFlags],
        pet_peeves:          [...archetypeData.defaultPetPeeves],
        favorite_topics:     target_role
          ? [target_role, ...archetypeData.favoriteTopics.slice(0, 2)]
          : [...archetypeData.favoriteTopics],
      };

      const { error: personalityError } = await supabase
        .from('interviewer_personality')
        .insert(personalityInsert);

      if (personalityError) {
        console.error('Error creating personality:', personalityError);
        // Non-fatal — continue without the personality record
      }
    }

    if (!finalInterviewerId) {
      return NextResponse.json(
        { error: 'Validation error', message: 'No interviewer selected or generated' },
        { status: 400 }
      );
    }

    // ── Increment monthly count for free users (optimistic lock) ─────────────
    if (subscription.tier === 'free') {
      const expectedCount =
        subscription.interviewsRemaining !== undefined
          ? 3 - subscription.interviewsRemaining
          : 0;

      const { data: updatedProfile, error: incrementError } = await supabase
        .from('profiles')
        .update({ monthly_interviews_used: expectedCount + 1 })
        .eq('id', user.id)
        .eq('monthly_interviews_used', expectedCount)
        .select('id')
        .single();

      if (incrementError || !updatedProfile) {
        console.error('Error incrementing interview count (possible race condition):', incrementError);
        return NextResponse.json(
          { error: 'Conflict', message: 'Interview count changed concurrently. Please try again.' },
          { status: 409 }
        );
      }
    }

    // ── Create interview session ──────────────────────────────────────────────
    const insertData = {
      user_id:           user.id,
      interviewer_id:    finalInterviewerId,
      interview_type,
      target_role,
      target_company,
      difficulty,
      status:            'in_progress' as const,
      session_length,
      max_user_messages: sessionConfig.maxUserMessages,
      voice_enabled:     body.use_voice_mode,
      // Premium fields — stored for analytics / replay; null for free/pro
      archetype_mix:    archetype_mix.length   > 0 ? archetype_mix   : null,
      constraints:      constraints.length     > 0 ? constraints     : null,
      trait_overrides:  Object.keys(trait_overrides).length > 0
        ? (trait_overrides as unknown as Json)
        : null,
    };

    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .insert(insertData as Database['public']['Tables']['interview_sessions']['Insert'])
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('Error creating session:', sessionError);

      // Roll back the interview count for free users
      if (subscription.tier === 'free') {
        const rollbackCount =
          subscription.interviewsRemaining !== undefined
            ? 3 - subscription.interviewsRemaining
            : 0;
        await supabase
          .from('profiles')
          .update({ monthly_interviews_used: rollbackCount })
          .eq('id', user.id);
      }

      return NextResponse.json(
        { error: 'Database error', message: 'Failed to create interview session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session_id:     session.id,
      interviewer_id: finalInterviewerId,
      message:        'Interview session created successfully',
    });

  } catch (error) {
    console.error('Error in create interview:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
