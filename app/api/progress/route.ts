import { NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import type { Badge, SessionScore } from '@/types/database';

interface RecentSession {
  id: string;
  date: string;
  score: number | null;
  interviewType: string;
  interviewerName: string;
  duration: number | null;
}

interface ScoreTrend {
  date: string;
  overall: number;
  clarity: number;
  confidence: number;
  technical: number;
  star: number;
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

    // Get user progress
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
    }

    // Get recent sessions with scores
    const { data: sessions, error: sessionsError } = await supabase
      .from('interview_sessions')
      .select(`
        id,
        started_at,
        interview_type,
        duration_seconds,
        status,
        interviewers (name),
        session_scores (overall_score, clarity_score, confidence_score, technical_depth, star_usage_score)
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(20);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
    }

    // Format recent sessions
    const recentSessions: RecentSession[] = (sessions ?? []).map((s) => ({
      id: s.id,
      date: s.started_at,
      score: (s.session_scores as SessionScore | null)?.overall_score ?? null,
      interviewType: s.interview_type,
      interviewerName: (s.interviewers as { name: string } | null)?.name ?? 'Unknown',
      duration: s.duration_seconds,
    }));

    // Calculate score trends (last 10 sessions with scores)
    const sessionsWithScores = recentSessions
      .filter((s) => s.score !== null)
      .slice(0, 10)
      .reverse();

    const scoreTrends: ScoreTrend[] = sessionsWithScores.map((s) => {
      const sessionData = sessions?.find((sess) => sess.id === s.id);
      const scores = sessionData?.session_scores as SessionScore | null;

      return {
        date: s.date,
        overall: scores?.overall_score ?? 0,
        clarity: scores?.clarity_score ?? 0,
        confidence: scores?.confidence_score ?? 0,
        technical: scores?.technical_depth ?? 0,
        star: scores?.star_usage_score ?? 0,
      };
    });

    // Calculate improvement metrics
    let improvement = null;
    if (scoreTrends.length >= 3) {
      const recentAvg = scoreTrends.slice(-3).reduce((sum, t) => sum + t.overall, 0) / 3;
      const olderAvg = scoreTrends.slice(0, 3).reduce((sum, t) => sum + t.overall, 0) / 3;
      improvement = {
        percent: Math.round(((recentAvg - olderAvg) / olderAvg) * 100),
        trend: recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable',
      };
    }

    // Format progress response
    const badges = (progress?.badges as Badge[] | null) ?? [];

    return NextResponse.json({
      progress: {
        totalSessions: progress?.total_sessions ?? 0,
        totalHours: progress?.total_hours ?? 0,
        currentStreak: progress?.current_streak ?? 0,
        longestStreak: progress?.longest_streak ?? 0,
        avgScore: progress?.avg_score ?? null,
        badges,
        lastSessionAt: progress?.last_session_at ?? null,
      },
      recentSessions: recentSessions.slice(0, 10),
      scoreTrends,
      improvement,
      stats: {
        completedToday: recentSessions.filter((s) => {
          const sessionDate = new Date(s.date).toDateString();
          const today = new Date().toDateString();
          return sessionDate === today;
        }).length,
        completedThisWeek: recentSessions.filter((s) => {
          const sessionDate = new Date(s.date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return sessionDate >= weekAgo;
        }).length,
        averageDuration: recentSessions.length > 0
          ? Math.round(
              recentSessions
                .filter((s) => s.duration !== null)
                .reduce((sum, s) => sum + (s.duration ?? 0), 0) /
              recentSessions.filter((s) => s.duration !== null).length / 60
            )
          : 0,
      },
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
