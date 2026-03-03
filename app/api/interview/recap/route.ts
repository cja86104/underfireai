import { NextResponse } from 'next/server';
import { createClient, getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';

interface SessionSummary {
  id: string;
  date: string;
  type: string;
  company: string | null;
  role: string | null;
  overallScore: number | null;
  strengths: string[];
  improvements: string[];
}

interface RecapReport {
  generatedAt: string;
  totalSessions: number;
  averageScore: number | null;
  creditsUsed: number;
  creditsRemaining: number;
  sessions: SessionSummary[];
  topStrengths: string[];
  topImprovements: string[];
  recommendation: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const subscription = await getSubscriptionStatus();

    // Fetch user's completed sessions with scores
    const { data: sessions, error: sessionsError } = await supabase
      .from('interview_sessions')
      .select(`
        id,
        started_at,
        interview_type,
        target_company,
        target_role,
        status,
        session_scores (
          overall_score,
          strengths,
          improvements
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(20);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to fetch interview history' },
        { status: 500 }
      );
    }

    // Process sessions into summaries
    const sessionSummaries: SessionSummary[] = (sessions || []).map((session) => {
      // session_scores is an array (one-to-many), take first if exists
      const scores = Array.isArray(session.session_scores) 
        ? session.session_scores[0] 
        : session.session_scores;

      return {
        id: session.id,
        date: session.started_at,
        type: session.interview_type || 'behavioral',
        company: session.target_company,
        role: session.target_role,
        overallScore: scores?.overall_score ?? null,
        strengths: scores?.strengths ?? [],
        improvements: scores?.improvements ?? [],
      };
    });

    // Aggregate stats
    const scores = sessionSummaries
      .map((s) => s.overallScore)
      .filter((s): s is number => s !== null);
    
    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    // Aggregate top strengths and improvements
    const strengthCounts = new Map<string, number>();
    const improvementCounts = new Map<string, number>();

    for (const session of sessionSummaries) {
      for (const s of session.strengths) {
        strengthCounts.set(s, (strengthCounts.get(s) || 0) + 1);
      }
      for (const i of session.improvements) {
        improvementCounts.set(i, (improvementCounts.get(i) || 0) + 1);
      }
    }

    const topStrengths = [...strengthCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([s]) => s);

    const topImprovements = [...improvementCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([i]) => i);

    // Generate recommendation
    let recommendation: string;
    if (sessionSummaries.length === 0) {
      recommendation = 'Start your interview practice journey by purchasing credits and completing your first mock interview.';
    } else if (averageScore !== null && averageScore >= 80) {
      recommendation = 'Excellent progress! You\'re performing well. Consider tackling more challenging interview types or targeting specific companies.';
    } else if (averageScore !== null && averageScore >= 60) {
      recommendation = 'Good progress! Focus on your improvement areas and consider practicing with different interview styles.';
    } else {
      recommendation = 'Keep practicing! Review your feedback from past sessions and focus on one improvement area at a time.';
    }

    const report: RecapReport = {
      generatedAt: new Date().toISOString(),
      totalSessions: sessionSummaries.length,
      averageScore,
      creditsUsed: subscription.usedInterviews,
      creditsRemaining: subscription.availableInterviews,
      sessions: sessionSummaries,
      topStrengths,
      topImprovements,
      recommendation,
    };

    return NextResponse.json(report);

  } catch (error) {
    console.error('Error generating recap:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to generate recap report' },
      { status: 500 }
    );
  }
}
