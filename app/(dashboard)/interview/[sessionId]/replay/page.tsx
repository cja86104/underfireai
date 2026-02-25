import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { InterviewReplay } from '@/components/interview/interview-replay';
import type { InterviewMessage, KeyMoment } from '@/types/database';
import type { CodeSubmissionReplay, CodingChallengeReplay } from '@/components/interview/code-replay-panel';

interface ReplayPageProps {
  params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({ params }: ReplayPageProps): Promise<Metadata> {
  const { sessionId } = await params;
  return {
    title: 'Interview Replay',
    description: `Replay and review interview session ${sessionId}`,
  };
}

export default async function InterviewReplayPage({ params }: ReplayPageProps): Promise<React.JSX.Element> {
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

  // Fetch messages with analysis
  const { data: messages, error: messagesError } = await supabase
    .from('interview_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Messages fetch error:', messagesError);
  }

  // Fetch code submissions if this was a coding interview
  let codeSubmissions: CodeSubmissionReplay[] = [];
  let codingChallenge: CodingChallengeReplay | null = null;

  if (session.challenge_id) {
    // Fetch the challenge
    const { data: challenge } = await supabase
      .from('coding_challenges')
      .select('id, title, description, difficulty, category, time_limit_seconds')
      .eq('id', session.challenge_id)
      .single();

    if (challenge) {
      codingChallenge = {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        category: challenge.category,
        timeLimitSeconds: challenge.time_limit_seconds,
      };
    }

    // Fetch code submissions
    const { data: submissions } = await supabase
      .from('code_submissions')
      .select('*')
      .eq('session_id', sessionId)
      .order('submitted_at', { ascending: true });

    if (submissions) {
      codeSubmissions = submissions.map((sub) => ({
        id: sub.id,
        language: sub.language,
        code: sub.code,
        status: sub.status,
        testResults: (sub.test_results as unknown as CodeSubmissionReplay['testResults']) ?? [],
        hintsUsed: sub.hints_used ?? 0,
        executionTimeMs: sub.execution_time_ms,
        submittedAt: sub.submitted_at,
        // Note: evaluation is stored in the message analysis, not separately
        evaluation: undefined,
      }));
    }
  }

  const interviewer = session.interviewers;
  const scores = session.session_scores;

  // Calculate total duration from messages if not available
  let totalDuration = session.duration_seconds ?? 0;
  if (totalDuration === 0 && messages && messages.length > 0) {
    const startTime = new Date(messages[0].created_at).getTime();
    const endTime = new Date(messages[messages.length - 1].created_at).getTime();
    totalDuration = Math.floor((endTime - startTime) / 1000);
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <InterviewReplay
        sessionId={session.id}
        messages={(messages ?? []) as unknown as InterviewMessage[]}
        scores={{
          overall_score: scores?.overall_score ?? null,
          clarity_score: scores?.clarity_score ?? null,
          confidence_score: scores?.confidence_score ?? null,
          technical_depth: scores?.technical_depth ?? null,
          star_usage_score: scores?.star_usage_score ?? null,
          communication_score: scores?.communication_score ?? null,
        }}
        keyMoments={(scores?.key_moments as unknown as KeyMoment[]) ?? []}
        interviewer={{
          name: interviewer.name,
          avatarUrl: interviewer.avatar_url,
        }}
        interviewType={session.interview_type}
        targetRole={session.target_role}
        totalDuration={totalDuration}
        startedAt={session.started_at}
        codingChallenge={codingChallenge}
        codeSubmissions={codeSubmissions}
      />
    </div>
  );
}
