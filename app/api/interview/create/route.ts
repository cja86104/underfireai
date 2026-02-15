import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import { INTERVIEWER_ARCHETYPES, type InterviewerArchetype } from '@/types/interviewer';
import { generateBackstory } from '@/lib/ai/backstory-generator';
import { SESSION_LENGTH_CONFIG as lengthConfig, type Database, type InterviewType, type CompanyStyle, type PersonalityBase, type Json, type SessionLength } from '@/types/database';

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    // Check subscription status
    const subscription = await getSubscriptionStatus();
    if (!subscription.canStartInterview) {
      return NextResponse.json(
        { error: 'Limit reached', message: 'You\'ve used all your free interviews this month. Upgrade to continue.' },
        { status: 403 }
      );
    }

    const body = await request.json() as CreateInterviewRequest;
    const {
      interview_type,
      company_style,
      target_role,
      target_company,
      difficulty,
      interviewer_id,
      generate_new_interviewer,
      session_length,
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

    const supabase = await createClient();
    let finalInterviewerId = interviewer_id;

    // Generate new interviewer if requested
    if (generate_new_interviewer || !interviewer_id) {
      const name = generateInterviewerName();

      // Pick from ALL 8 archetypes
      const archetypeKeys = Object.keys(INTERVIEWER_ARCHETYPES) as InterviewerArchetype[];
      const archetypeKey = archetypeKeys[Math.floor(Math.random() * archetypeKeys.length)];
      const archetypeData = INTERVIEWER_ARCHETYPES[archetypeKey];

      // Adjust personality based on difficulty
      const difficultyModifier = (difficulty - 5) * 5; // -20 to +20
      const personality: PersonalityBase = {
        directness: Math.min(100, Math.max(0, archetypeData.basePersonality.directness + difficultyModifier)),
        depth_preference: Math.min(100, Math.max(0, archetypeData.basePersonality.depth_preference + difficultyModifier)),
        warmth: Math.min(100, Math.max(0, archetypeData.basePersonality.warmth - difficultyModifier)),
        patience: Math.min(100, Math.max(0, archetypeData.basePersonality.patience - difficultyModifier)),
        technical_focus: archetypeData.basePersonality.technical_focus,
        skepticism: Math.min(100, Math.max(0, archetypeData.basePersonality.skepticism + difficultyModifier)),
      };

      // Generate AI backstory
      const backstory = await generateBackstory({
        archetypeId: archetypeKey,
        archetypeName: archetypeData.name,
        archetypeDescription: archetypeData.description,
        interviewType: interview_type,
        companyStyle: company_style,
        roleTarget: target_role,
        interviewerName: name,
      });

      // Use archetype's suggested voice
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
            current: 'neutral' as const,
            intensity: 50,
            triggers: [],
          } as unknown as Json,
          voice_config: {
            voice_id: voiceId,
            speed: 1.0,
            pitch: 1.0,
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

      // Create interviewer personality using archetype defaults
      const personalityInsert: Database['public']['Tables']['interviewer_personality']['Insert'] = {
        interviewer_id: newInterviewer.id,
        communication_style: archetypeData.communicationStyle as unknown as Json,
        question_patterns: archetypeData.questionPatterns as unknown as Json,
        red_flags: [...archetypeData.defaultRedFlags],
        green_flags: [...archetypeData.defaultGreenFlags],
        pet_peeves: [...archetypeData.defaultPetPeeves],
        favorite_topics: target_role
          ? [target_role, ...archetypeData.favoriteTopics.slice(0, 2)]
          : [...archetypeData.favoriteTopics],
      };
      const { error: personalityError } = await supabase
        .from('interviewer_personality')
        .insert(personalityInsert);

      if (personalityError) {
        console.error('Error creating personality:', personalityError);
        // Non-fatal - continue without personality record
      }
    }

    if (!finalInterviewerId) {
      return NextResponse.json(
        { error: 'Validation error', message: 'No interviewer selected or generated' },
        { status: 400 }
      );
    }

    // Increment monthly interview count for free users BEFORE session creation (optimistic locking)
    if (subscription.tier === 'free') {
      const expectedCount = subscription.interviewsRemaining !== undefined
        ? 3 - subscription.interviewsRemaining
        : 0;

      const { data: updatedProfile, error: incrementError } = await supabase
        .from('profiles')
        .update({
          monthly_interviews_used: expectedCount + 1,
        })
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

    // Create interview session with session length limits
    // Note: session_length and max_user_messages columns added by migration 002_session_length.sql
    const insertData = {
      user_id: user.id,
      interviewer_id: finalInterviewerId,
      interview_type,
      target_role,
      target_company,
      difficulty,
      status: 'in_progress' as const,
      session_length,
      max_user_messages: sessionConfig.maxUserMessages,
    };

    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .insert(insertData as Database['public']['Tables']['interview_sessions']['Insert'])
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('Error creating session:', sessionError);

      // Roll back the interview count increment for free users
      if (subscription.tier === 'free') {
        const rollbackCount = subscription.interviewsRemaining !== undefined
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
      session_id: session.id,
      interviewer_id: finalInterviewerId,
      message: 'Interview session created successfully',
    });

  } catch (error) {
    console.error('Error in create interview:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
