import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import { INTERVIEWER_ARCHETYPES } from '@/lib/ai/config';
import type { InterviewType, CompanyStyle, PersonalityBase } from '@/types/database';

interface CreateInterviewRequest {
  interview_type: InterviewType;
  company_style: CompanyStyle;
  target_role: string | null;
  target_company: string | null;
  difficulty: number;
  use_voice_mode: boolean;
  interviewer_id: string | null;
  generate_new_interviewer: boolean;
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

// Select a random archetype and generate personality
function generateInterviewerPersonality(difficulty: number): {
  archetype: keyof typeof INTERVIEWER_ARCHETYPES;
  personality: PersonalityBase;
  backstory: string;
} {
  const archetypeKeys = Object.keys(INTERVIEWER_ARCHETYPES) as (keyof typeof INTERVIEWER_ARCHETYPES)[];
  const archetype = archetypeKeys[Math.floor(Math.random() * archetypeKeys.length)];
  const base = INTERVIEWER_ARCHETYPES[archetype];

  // Adjust personality based on difficulty
  const difficultyModifier = (difficulty - 5) * 5; // -20 to +20

  const personality: PersonalityBase = {
    directness: Math.min(100, Math.max(0, base.personality.directness + difficultyModifier)),
    depth_preference: Math.min(100, Math.max(0, base.personality.depth_preference + difficultyModifier)),
    warmth: Math.min(100, Math.max(0, base.personality.warmth - difficultyModifier)),
    patience: Math.min(100, Math.max(0, base.personality.patience - difficultyModifier)),
    technical_focus: base.personality.technical_focus,
    skepticism: Math.min(100, Math.max(0, base.personality.skepticism + difficultyModifier)),
  };

  // Generate backstory based on archetype
  const backstories: Record<keyof typeof INTERVIEWER_ARCHETYPES, string[]> = {
    skeptic: [
      'Burned by a bad hire last year who talked a great game but couldn\'t deliver. Now you verify everything.',
      'Rose through the ranks by being thorough and detail-oriented. You expect the same from candidates.',
      'Former consultant who\'s seen every type of BS answer. You can spot fluff from a mile away.',
    ],
    friendly: [
      'Remember how nervous you were in your first big interview. You try to put candidates at ease.',
      'Believe the best interviews feel like conversations, not interrogations. But you still need answers.',
      'Known for your warm demeanor, but colleagues know you ask the toughest questions when it matters.',
    ],
    silentJudge: [
      'Prefer to observe and analyze rather than fill silence. The best candidates are comfortable with pauses.',
      'Trained as an engineer - you value precision over personality. Let your work speak for itself.',
      'Believe in giving candidates space to think. Rambling is a red flag.',
    ],
    rapidFire: [
      'Time is money. In a fast-paced environment, you need people who can think on their feet.',
      'Former startup founder who values efficiency above all. Long-winded answers waste everyone\'s time.',
      'Believe pressure reveals character. If they can\'t handle a quick interview, how will they handle deadlines?',
    ],
    cultureFit: [
      'Seen brilliant jerks destroy team morale. Skills matter, but so does how you treat people.',
      'Built your career on strong relationships. Looking for collaborators, not lone wolves.',
      'Believe diverse perspectives make better products. Want to hear how candidates work with others.',
    ],
  };

  const backstoryOptions = backstories[archetype];
  const backstory = backstoryOptions[Math.floor(Math.random() * backstoryOptions.length)];

  return { archetype, personality, backstory };
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

    // Check subscription status
    const subscription = await getSubscriptionStatus();
    if (!subscription.canStartInterview) {
      return NextResponse.json(
        { error: 'Limit reached', message: 'You\'ve used all your free interviews this month. Upgrade to continue.' },
        { status: 403 }
      );
    }

    const body: CreateInterviewRequest = await request.json();
    const {
      interview_type,
      company_style,
      target_role,
      target_company,
      difficulty,
      interviewer_id,
      generate_new_interviewer,
    } = body;

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
      const { archetype, personality, backstory } = generateInterviewerPersonality(difficulty);
      const archetypeData = INTERVIEWER_ARCHETYPES[archetype];

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
          personality_base: personality,
          difficulty_level: difficulty,
          current_mood: {
            current: 'neutral' as const,
            intensity: 50,
            triggers: [],
          },
          voice_config: {
            voice_id: 'alloy',
            speed: 1.0,
            pitch: 1.0,
          },
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

      // Create interviewer personality
      const { error: personalityError } = await supabase
        .from('interviewer_personality')
        .insert({
          interviewer_id: newInterviewer.id,
          communication_style: {
            style: archetype === 'rapidFire' ? 'direct' : 
                   archetype === 'friendly' ? 'supportive' :
                   archetype === 'skeptic' ? 'challenging' : 'probing',
            formality: company_style === 'consulting' || company_style === 'government' ? 80 :
                       company_style === 'startup' ? 30 : 50,
            verbosity: archetype === 'silentJudge' ? 20 :
                       archetype === 'rapidFire' ? 30 : 50,
          },
          question_patterns: {
            follow_up_tendency: archetype === 'skeptic' ? 90 :
                                archetype === 'rapidFire' ? 80 : 60,
            depth_preference: personality.depth_preference,
            curveball_frequency: difficulty * 8,
          },
          red_flags: archetypeData.redFlags,
          green_flags: archetypeData.greenFlags,
          pet_peeves: [
            'Vague or generic answers',
            'Not answering the actual question',
            'Excessive use of buzzwords',
          ],
          favorite_topics: target_role ? [target_role, 'leadership', 'problem-solving'] : ['leadership', 'teamwork', 'problem-solving'],
        });

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

    // Create interview session
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: user.id,
        interviewer_id: finalInterviewerId,
        interview_type,
        target_role,
        target_company,
        difficulty,
        status: 'in_progress',
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to create interview session' },
        { status: 500 }
      );
    }

    // Increment monthly interview count for free users
    if (subscription.tier === 'free') {
      await supabase
        .from('profiles')
        .update({
          monthly_interviews_used: (subscription.interviewsRemaining !== undefined 
            ? 3 - subscription.interviewsRemaining + 1 
            : 1),
        })
        .eq('id', user.id);
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
