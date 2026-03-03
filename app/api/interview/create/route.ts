import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import { INTERVIEWER_ARCHETYPES, type InterviewerArchetype } from '@/types/interviewer';
import { generateBackstory } from '@/lib/ai/backstory-generator';
import {
  getResumeVulnerabilitiesForInterview,
  getJdGapsForInterview,
  buildResumeTargetingPrompt,
} from '@/lib/resume/interview-context';
import {
  SESSION_LENGTH_CONFIG as lengthConfig,
  type Database,
  type InterviewType,
  type CompanyStyle,
  type PersonalityBase,
  type Json,
  type SessionLength,
} from '@/types/database';
import { PANEL_ROLE_PRESETS, createInitialPanelState, type PanelPreset } from '@/types/panel';
import type { SupabaseClient } from '@supabase/supabase-js';

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
  // ── Panel mode ──────────────────────────────────────────────────────────────
  /**
   * Panel preset to use when interview_type is 'panel'.
   * If not provided, defaults to 'engineering_loop'.
   */
  panel_preset?: PanelPreset;
  // ── Coding mode ─────────────────────────────────────────────────────────────
  /**
   * Challenge ID for coding interviews.
   * If not provided, a random challenge matching difficulty will be selected.
   */
  challenge_id?: string;
  /**
   * Programming language for coding interviews.
   */
  programming_language?: string;
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
  // ── Premium: Resume Targeting ─────────────────────────────────────────────────
  /**
   * When true, the interviewer will probe the candidate's resume vulnerabilities.
   */
  target_resume_weak_spots?: boolean;
  /**
   * JD ID to use for gap-targeted practice.
   */
  target_job_description_id?: string;
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

interface GeneratedInterviewer {
  id: string;
  name: string;
  archetypeKey: InterviewerArchetype;
}

/**
 * Generate a single interviewer with the given archetype.
 * Used by both single-interviewer and panel modes.
 */
async function generateSingleInterviewer(
  supabase: SupabaseClient<Database>,
  userId: string,
  archetypeKey: InterviewerArchetype,
  params: {
    interview_type: InterviewType;
    company_style: CompanyStyle;
    target_role: string | null;
    difficulty: number;
    use_voice_mode: boolean;
    constraints?: string[];
  }
): Promise<GeneratedInterviewer | null> {
  const name = generateInterviewerName();
  const archetypeData = INTERVIEWER_ARCHETYPES[archetypeKey];
  const difficultyModifier = (params.difficulty - 5) * 5;

  const personality: PersonalityBase = {
    directness:       clamp(archetypeData.basePersonality.directness       + difficultyModifier),
    depth_preference: clamp(archetypeData.basePersonality.depth_preference + difficultyModifier),
    warmth:           clamp(archetypeData.basePersonality.warmth           - difficultyModifier),
    patience:         clamp(archetypeData.basePersonality.patience         - difficultyModifier),
    technical_focus:  archetypeData.basePersonality.technical_focus,
    skepticism:       clamp(archetypeData.basePersonality.skepticism       + difficultyModifier),
  };

  const backstory = await generateBackstory({
    archetypeId:          archetypeKey,
    archetypeName:        archetypeData.name,
    archetypeDescription: archetypeData.description,
    interviewType:        params.interview_type,
    companyStyle:         params.company_style,
    roleTarget:           params.target_role,
    interviewerName:      name,
    constraints:          params.constraints ?? [],
  });

  const voiceId = archetypeData.suggestedVoices[0] ?? 'katie';

  const { data: newInterviewer, error: interviewerError } = await supabase
    .from('interviewers')
    .insert({
      user_id: userId,
      name,
      interview_type: params.interview_type,
      company_style: params.company_style,
      role_focus: params.target_role,
      backstory,
      personality_base: personality as unknown as Json,
      difficulty_level: params.difficulty,
      current_mood: {
        current:   'neutral' as const,
        intensity: 50,
        triggers:  [],
      } as unknown as Json,
      voice_config: {
        voice_id:    voiceId,
        speed:       1.0,
        pitch:       1.0,
        tts_enabled: params.use_voice_mode,
      } as unknown as Json,
    })
    .select('id')
    .single();

  if (interviewerError || !newInterviewer) {
    console.error('Error creating interviewer:', interviewerError);
    return null;
  }

  // Create interviewer personality record (non-fatal)
  const personalityInsert: Database['public']['Tables']['interviewer_personality']['Insert'] = {
    interviewer_id:      newInterviewer.id,
    communication_style: archetypeData.communicationStyle as unknown as Json,
    question_patterns:   archetypeData.questionPatterns   as unknown as Json,
    red_flags:           [...archetypeData.defaultRedFlags],
    green_flags:         [...archetypeData.defaultGreenFlags],
    pet_peeves:          [...archetypeData.defaultPetPeeves],
    favorite_topics:     params.target_role
      ? [params.target_role, ...archetypeData.favoriteTopics.slice(0, 2)]
      : [...archetypeData.favoriteTopics],
  };

  const { error: personalityError } = await supabase
    .from('interviewer_personality')
    .insert(personalityInsert);

  if (personalityError) {
    console.error('Error creating personality:', personalityError);
  }

  return {
    id: newInterviewer.id,
    name,
    archetypeKey,
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

    // Credit check — user must have available interview credits
    const subscription = await getSubscriptionStatus();

    if (!subscription.canStartInterview) {
      return NextResponse.json(
        { 
          error: 'No credits remaining', 
          message: "You've used all your interview credits. Purchase more to continue.",
          availableInterviews: subscription.availableInterviews,
        },
        { status: 403 }
      );
    }

    const body = await request.json() as CreateInterviewRequest;

    // ═══════════════════════════════════════════════════════════════════════════
    // ALL FEATURES UNLOCKED FOR PURCHASERS
    // No more premium gates - everyone who has purchased gets everything
    // ═══════════════════════════════════════════════════════════════════════════

    const {
      interview_type,
      company_style,
      target_role,
      target_company,
      difficulty,
      interviewer_id,
      generate_new_interviewer,
      session_length,
      panel_preset = 'engineering_loop',
      challenge_id: requestedChallengeId,
      programming_language,
      archetype_mix   = [],
      constraints     = [],
      trait_overrides = {},
      target_resume_weak_spots = false,
      target_job_description_id,
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
    const panelInterviewers: { id: string; name: string; archetypeKey: InterviewerArchetype; roleLabel: string; isLead: boolean }[] = [];

    // ── Panel mode: generate multiple interviewers ─────────────────────────────
    if (interview_type === 'panel') {
      const presetRoles = PANEL_ROLE_PRESETS[panel_preset];
      if (!presetRoles) {
        return NextResponse.json(
          { error: 'Validation error', message: `Unknown panel preset: ${panel_preset}` },
          { status: 400 }
        );
      }

      // Generate each panel member
      for (let i = 0; i < presetRoles.length; i++) {
        const role = presetRoles[i];
        const archetypeKey = role.archetype as InterviewerArchetype;

        const interviewer = await generateSingleInterviewer(supabase, user.id, archetypeKey, {
          interview_type,
          company_style,
          target_role,
          difficulty,
          use_voice_mode: body.use_voice_mode,
          constraints,
        });

        if (!interviewer) {
          return NextResponse.json(
            { error: 'Database error', message: `Failed to create panel interviewer ${i + 1}` },
            { status: 500 }
          );
        }

        panelInterviewers.push({
          ...interviewer,
          roleLabel: role.roleLabel,
          isLead: i === 0, // First interviewer is the lead
        });
      }

      // Use the lead interviewer as the primary interviewer_id for the session
      finalInterviewerId = panelInterviewers[0].id;

    } else if (generate_new_interviewer || !interviewer_id) {
      // ── Single interviewer mode (existing logic refactored) ──────────────────

      // ── Archetype selection ───────────────────────────────────────────────
      const archetypeKeys = Object.keys(INTERVIEWER_ARCHETYPES) as InterviewerArchetype[];
      const archetypeKey: InterviewerArchetype =
        archetype_mix.length > 0
          ? archetype_mix[0]
          : archetypeKeys[Math.floor(Math.random() * archetypeKeys.length)];

      const archetypeData = INTERVIEWER_ARCHETYPES[archetypeKey];

      // ── Base personality with difficulty modifier ─────────────────────────
      const difficultyModifier = (difficulty - 5) * 5;

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
      const name = generateInterviewerName();
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

      const voiceId = archetypeData.suggestedVoices[0] ?? 'katie';

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

      // Create interviewer personality record (non-fatal)
      const personalityInsert: Database['public']['Tables']['interviewer_personality']['Insert'] = {
        interviewer_id:      newInterviewer.id,
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
      }
    }

    if (!finalInterviewerId) {
      return NextResponse.json(
        { error: 'Validation error', message: 'No interviewer selected or generated' },
        { status: 400 }
      );
    }

    // ── Sync existing interviewer voice config with session voice setting ───────
    // When reusing an existing interviewer, their stored tts_enabled may not
    // match the current session's use_voice_mode toggle. Update it.
    if (interviewer_id && !generate_new_interviewer) {
      const { data: existingInterviewer } = await supabase
        .from('interviewers')
        .select('voice_config')
        .eq('id', finalInterviewerId)
        .single();

      if (existingInterviewer?.voice_config) {
        const currentConfig = existingInterviewer.voice_config as unknown as { voice_id: string; speed: number; pitch: number; tts_enabled?: boolean };
        if (currentConfig.tts_enabled !== body.use_voice_mode) {
          await supabase
            .from('interviewers')
            .update({
              voice_config: {
                ...currentConfig,
                tts_enabled: body.use_voice_mode,
              } as unknown as Json,
            })
            .eq('id', finalInterviewerId);
        }
      }
    }

    // ── Use one interview credit (optimistic lock) ─────────────────────────────
    const expectedUsed = subscription.usedInterviews;

    const { data: updatedProfile, error: incrementError } = await supabase
      .from('profiles')
      .update({ interviews_used: expectedUsed + 1 })
      .eq('id', user.id)
      .eq('interviews_used', expectedUsed)
      .select('id')
      .single();

    if (incrementError || !updatedProfile) {
      console.error('Error using interview credit (possible race condition):', incrementError);
      return NextResponse.json(
        { error: 'Conflict', message: 'Interview count changed concurrently. Please try again.' },
        { status: 409 }
      );
    }

    // ── Create interview session ──────────────────────────────────────────────
    // Initialize panel_state for panel interviews
    const initialPanelState = interview_type === 'panel' && panelInterviewers.length > 0
      ? createInitialPanelState(panelInterviewers.map(p => p.id))
      : null;

    // ── Handle coding interview challenge selection ────────────────────────────
    let selectedChallengeId: string | null = null;
    let codingTimeLimit: number | null = null;

    if (interview_type === 'technical' && requestedChallengeId) {
      // Validate the challenge exists
      const { data: challenge } = await supabase
        .from('coding_challenges')
        .select('id, time_limit_seconds')
        .eq('id', requestedChallengeId)
        .single();

      if (challenge) {
        selectedChallengeId = challenge.id;
        codingTimeLimit = challenge.time_limit_seconds;
      }
    } else if (interview_type === 'technical' && !requestedChallengeId) {
      // Auto-select a challenge based on difficulty
      const { data: challenges } = await supabase
        .from('coding_challenges')
        .select('id, time_limit_seconds')
        .gte('difficulty', Math.max(1, difficulty - 2))
        .lte('difficulty', Math.min(10, difficulty + 2))
        .limit(10);

      if (challenges && challenges.length > 0) {
        const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
        selectedChallengeId = randomChallenge.id;
        codingTimeLimit = randomChallenge.time_limit_seconds;
      }
    }

    // ── Fetch resume targeting context if enabled (Premium) ────────────────────
    let resumeTargetingContext: Json | null = null;

    if (target_resume_weak_spots || target_job_description_id) {
      const vulnerabilities = target_resume_weak_spots
        ? await getResumeVulnerabilitiesForInterview(user.id, 5)
        : [];

      const gaps = target_job_description_id
        ? await getJdGapsForInterview(user.id, target_job_description_id)
        : [];

      if (vulnerabilities.length > 0 || gaps.length > 0) {
        resumeTargetingContext = {
          vulnerabilities,
          gaps,
          promptContext: buildResumeTargetingPrompt(vulnerabilities, gaps),
        } as unknown as Json;
      }
    }

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
      panel_state:       initialPanelState as unknown as Json,
      // Coding interview fields
      challenge_id:              selectedChallengeId,
      programming_language:      programming_language ?? null,
      coding_time_limit_seconds: codingTimeLimit,
      // Premium fields — stored for analytics / replay; null for free/pro
      archetype_mix:    archetype_mix.length   > 0 ? archetype_mix   : null,
      constraints:      constraints.length     > 0 ? constraints     : null,
      trait_overrides:  Object.keys(trait_overrides).length > 0
        ? (trait_overrides as unknown as Json)
        : null,
      // Premium: Resume targeting
      target_resume_weak_spots:   target_resume_weak_spots || null,
      target_job_description_id:  target_job_description_id ?? null,
      resume_targeting_context:   resumeTargetingContext,
    };

    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .insert(insertData as Database['public']['Tables']['interview_sessions']['Insert'])
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('Error creating session:', sessionError);

      // Roll back the interview credit
      await supabase
        .from('profiles')
        .update({ interviews_used: expectedUsed })
        .eq('id', user.id);

      return NextResponse.json(
        { error: 'Database error', message: 'Failed to create interview session' },
        { status: 500 }
      );
    }

    // ── Insert session_interviewers for panel mode ─────────────────────────────
    if (interview_type === 'panel' && panelInterviewers.length > 0) {
      const sessionInterviewerInserts = panelInterviewers.map((p, idx) => ({
        session_id:     session.id,
        interviewer_id: p.id,
        seat_order:     idx,
        role_label:     p.roleLabel,
        is_lead:        p.isLead,
      }));

      const { error: sessionInterviewersError } = await supabase
        .from('session_interviewers')
        .insert(sessionInterviewerInserts);

      if (sessionInterviewersError) {
        console.error('Error creating session_interviewers:', sessionInterviewersError);
        // Non-fatal for now, but log for debugging
      }
    }

    return NextResponse.json({
      session_id:     session.id,
      interviewer_id: finalInterviewerId,
      panel:          interview_type === 'panel' ? panelInterviewers : undefined,
      challenge_id:   selectedChallengeId,
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
