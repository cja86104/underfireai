import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { InterviewResults } from '@/components/interview/interview-results';
import { ResumeAlignmentPanel } from '@/components/resume';
import type { InterviewMessage } from '@/types/database';

interface ResultsPageProps {
  params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({ params }: ResultsPageProps): Promise<Metadata> {
  const { sessionId } = await params;
  return {
    title: 'Interview Results',
    description: `Results for interview session ${sessionId}`,
  };
}

export default async function InterviewResultsPage({ params }: ResultsPageProps): Promise<React.JSX.Element> {
  const { sessionId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();

  // Fetch session with all related data
  const { data: session, error: sessionError } = await supabase
    .from('interview_sessions')
    .select(`
      *,
      interviewers (
        id,
        name,
        avatar_url,
        interview_type,
        company_style,
        difficulty_level
      ),
      session_scores (*)
    `)
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) {
    console.error('Session fetch error:', sessionError);
    notFound();
  }

  // Redirect if session not completed
  if (session.status !== 'completed') {
    redirect(`/interview/${sessionId}`);
  }

  // Fetch messages for transcript
  const { data: messages, error: messagesError } = await supabase
    .from('interview_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Messages fetch error:', messagesError);
  }

  // Fetch user profile to check subscription
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const isPaidUser = profile?.subscription_tier !== 'free';

  const interviewer = session.interviewers;
  const scores = session.session_scores;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <InterviewResults
        session={{
          id: session.id,
          interviewType: session.interview_type,
          targetRole: session.target_role,
          targetCompany: session.target_company,
          difficulty: session.difficulty,
          startedAt: session.started_at,
          endedAt: session.ended_at,
          durationSeconds: session.duration_seconds,
        }}
        interviewer={{
          id: interviewer.id,
          name: interviewer.name,
          avatarUrl: interviewer.avatar_url,
          interviewType: interviewer.interview_type,
          companyStyle: interviewer.company_style,
        }}
        scores={scores ? {
          overallScore: scores.overall_score,
          clarityScore: scores.clarity_score,
          confidenceScore: scores.confidence_score,
          technicalDepth: scores.technical_depth,
          starUsageScore: scores.star_usage_score,
          communicationScore: scores.communication_score,
          strengths: scores.strengths,
          improvements: scores.improvements,
          aiFeedback: scores.ai_feedback,
          interviewerImpression: scores.interviewer_impression,
          keyMoments: scores.key_moments as { type: string; description: string }[] | null,
        } : null}
        messages={(messages ?? []) as unknown as InterviewMessage[]}
      />

      {/* Resume Alignment Panel */}
      <ResumeAlignmentPanel sessionId={sessionId} isPaidUser={isPaidUser} />
    </div>
  );
}
