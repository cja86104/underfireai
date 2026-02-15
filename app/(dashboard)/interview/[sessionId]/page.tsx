import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient, getCurrentUser, getUserResume } from '@/lib/supabase/server';
import { InterviewChat } from '@/components/interview/interview-chat';
import type { PersonalityBase, InterviewerMood, VoiceConfig, InterviewMessage, CommunicationStyle, QuestionPatterns } from '@/types/database';

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

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <InterviewChat
        sessionId={session.id}
        sessionStatus={session.status}
        interviewType={session.interview_type}
        targetRole={session.target_role}
        targetCompany={session.target_company}
        difficulty={session.difficulty}
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
        voiceEnabled={!!(interviewer.voice_config as VoiceConfig | null)?.tts_enabled}
      />
    </div>
  );
}
