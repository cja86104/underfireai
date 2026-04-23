import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient, getCurrentUser, getUserResume } from '@/lib/supabase/server';
import { InterviewChat } from '@/components/interview/interview-chat';
import { is3DHudEnabled } from '@/lib/hud/feature-flags';
import { CodingInterviewPage } from '@/components/coding/coding-interview-page';
import type { PersonalityBase, InterviewerMood, VoiceConfig, InterviewMessage, CommunicationStyle, QuestionPatterns } from '@/types/database';
import type { CodingChallenge, ProgrammingLanguage, TestCase } from '@/types/coding';

interface InterviewSessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({ params }: InterviewSessionPageProps): Promise<Metadata> {
  const { sessionId } = await params;
  return {
    title: 'Interview Session',
    description: `Mock interview session ${sessionId}`,
  };
}

export default async function InterviewSessionPage({ params }: InterviewSessionPageProps): Promise<React.JSX.Element> {
  const { sessionId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();

  // Fetch session with interviewer and personality data
  const { data: session, error: sessionError } = await supabase
    .from('interview_sessions')
    .select(`
      *,
      interviewers (
        *,
        interviewer_personality (*)
      )
    `)
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) {
    console.error('Session fetch error:', sessionError);
    notFound();
  }

  // Redirect completed sessions to results page
  if (session.status === 'completed') {
    redirect(`/interview/${sessionId}/results`);
  }

  // Fetch existing messages
  const { data: messages, error: messagesError } = await supabase
    .from('interview_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (messagesError) {
    console.error('Messages fetch error:', messagesError);
  }

  // Fetch panel members for panel mode
  const isPanelMode = session.interview_type === 'panel';
  const isCodingMode = session.interview_type === 'technical' && session.challenge_id;
  let panelMembers: { id: string; name: string; avatarUrl: string | null; roleLabel: string | null; isLead: boolean }[] = [];
  let codingChallenge: CodingChallenge | null = null;

  if (isPanelMode) {
    const { data: sessionInterviewers, error: panelError } = await supabase
      .from('session_interviewers')
      .select(`
        interviewer_id,
        seat_order,
        role_label,
        is_lead,
        interviewers (
          id,
          name,
          avatar_url
        )
      `)
      .eq('session_id', sessionId)
      .order('seat_order');

    if (panelError) {
      console.error('Panel fetch error:', panelError);
    } else if (sessionInterviewers) {
      panelMembers = sessionInterviewers.map((si) => {
        const interviewerData = si.interviewers as unknown as { id: string; name: string; avatar_url: string | null };
        return {
          id: interviewerData.id,
          name: interviewerData.name,
          avatarUrl: interviewerData.avatar_url,
          roleLabel: si.role_label,
          isLead: si.is_lead ?? false,
        };
      });
    }
  }

  // Fetch coding challenge for coding mode
  if (isCodingMode && session.challenge_id) {
    const { data: challenge, error: challengeError } = await supabase
      .from('coding_challenges')
      .select('*')
      .eq('id', session.challenge_id)
      .single();

    if (challengeError) {
      console.error('Challenge fetch error:', challengeError);
    } else if (challenge) {
      codingChallenge = {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        category: challenge.category,
        languages: challenge.languages as ProgrammingLanguage[],
        starterCode: challenge.starter_code as Record<ProgrammingLanguage, string>,
        testCases: challenge.test_cases as unknown as TestCase[],
        hints: challenge.hints ?? [],
        timeLimitSeconds: challenge.time_limit_seconds,
      };
    }
  }

  // Fetch user resume for context
  const resume = await getUserResume();

  // Extract interviewer data
  const interviewer = session.interviewers;
  const personality = interviewer?.interviewer_personality ?? null;

  // Build resume context string
  let resumeContext: string | null = null;
  if (resume?.parsed_data) {
    const parsed = resume.parsed_data;
    const parts: string[] = [];
    
    if (parsed.summary) {
      parts.push(`Summary: ${parsed.summary}`);
    }
    if (parsed.experience && parsed.experience.length > 0) {
      const expStr = parsed.experience
        .slice(0, 3)
        .map((exp) => `${exp.title} at ${exp.company}`)
        .join(', ');
      parts.push(`Recent Experience: ${expStr}`);
    }
    if (parsed.skills && parsed.skills.length > 0) {
      parts.push(`Skills: ${parsed.skills.slice(0, 10).join(', ')}`);
    }
    if (resume.target_role) {
      parts.push(`Target Role: ${resume.target_role}`);
    }
    
    resumeContext = parts.join('\n');
  }

  // Render coding interview UI if in coding mode with a challenge
  if (isCodingMode && codingChallenge) {
    return (
      <div className="h-[calc(100vh-4rem)] lg:h-[calc(100vh-8rem)] flex flex-col">
        <CodingInterviewPage
          sessionId={session.id}
          sessionStatus={session.status}
          challenge={codingChallenge}
          initialLanguage={(session.programming_language as ProgrammingLanguage) ?? undefined}
          interviewer={{
            id: interviewer.id,
            name: interviewer.name,
            avatarUrl: interviewer.avatar_url,
          }}
          initialMessages={(messages ?? []) as unknown as InterviewMessage[]}
          startedAt={session.started_at}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-[calc(100vh-8rem)] flex flex-col">
      <InterviewChat
        sessionId={session.id}
        sessionStatus={session.status}
        interviewType={session.interview_type}
        targetRole={session.target_role}
        targetCompany={session.target_company}
        companyStyle={interviewer.company_style ?? null}
        interviewer={{
          id: interviewer.id,
          name: interviewer.name,
          avatarUrl: interviewer.avatar_url,
          backstory: interviewer.backstory,
          personalityBase: interviewer.personality_base as PersonalityBase | null,
          currentMood: interviewer.current_mood as InterviewerMood | null,
          voiceConfig: interviewer.voice_config as VoiceConfig | null,
        }}
        interviewerPersonality={personality ? {
          communicationStyle: personality.communication_style as CommunicationStyle | null,
          questionPatterns: personality.question_patterns as QuestionPatterns | null,
          redFlags: personality.red_flags,
          greenFlags: personality.green_flags,
          petPeeves: personality.pet_peeves,
          favoriteTopics: personality.favorite_topics,
        } : null}
        initialMessages={(messages ?? []) as unknown as InterviewMessage[]}
        resumeContext={resumeContext}
        startedAt={session.started_at}
        voiceEnabled={!!session.voice_enabled}
        panelMembers={panelMembers}
        maxUserMessages={session.max_user_messages ?? 20}
        isHudMode={is3DHudEnabled()}
      />
    </div>
  );
}
