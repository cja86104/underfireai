import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import {
  generateAndSaveSuggestions,
  getUserInsights,
  calculateResumeHealthScore,
} from '@/lib/resume/insights-service';

/**
 * POST /api/resume/suggestions
 *
 * Generate resume suggestions from one or more interview sessions.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    // Check subscription tier
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || profile.subscription_tier === 'free') {
      return NextResponse.json(
        {
          error: 'Upgrade required',
          message: 'Resume suggestions are available on Pro and Premium plans',
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { sessionIds?: string[] };
    const { sessionIds } = body;

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: 'Bad request', message: 'sessionIds array is required' },
        { status: 400 }
      );
    }

    // Limit to 10 sessions max
    const limitedSessionIds = sessionIds.slice(0, 10);

    // Verify all sessions belong to user and are completed
    const { data: sessions, error: sessionsError } = await supabase
      .from('interview_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .in('id', limitedSessionIds);

    if (sessionsError || !sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: 'Not found', message: 'No valid completed sessions found' },
        { status: 404 }
      );
    }

    const validSessionIds = sessions.map((s) => s.id);

    // Generate suggestions
    const batch = await generateAndSaveSuggestions(user.id, validSessionIds);

    if (!batch) {
      return NextResponse.json(
        {
          error: 'Generation failed',
          message: 'Could not generate suggestions. Do you have a resume uploaded?',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      suggestions: batch.suggestions,
      summary: batch.summary,
      topPriority: batch.topPriority,
      sessionsAnalyzed: batch.sessionsAnalyzed,
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resume/suggestions
 *
 * Get recent suggestions and resume health score.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    // Get recent suggestion insights
    const insights = await getUserInsights(user.id, 'suggestion', 5);

    // Get health score
    const healthScore = await calculateResumeHealthScore(user.id);

    // Flatten suggestions from all insights
    const allSuggestions = insights.flatMap((i) => i.resumeSuggestions);

    // Dedupe by suggested text
    const seen = new Set<string>();
    const uniqueSuggestions = allSuggestions.filter((s) => {
      const key = s.suggestedText.toLowerCase().slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      suggestions: uniqueSuggestions.slice(0, 20),
      healthScore: healthScore.score,
      healthDetails: {
        alignmentAvg: healthScore.alignmentAvg,
        vulnerabilityScore: healthScore.vulnerabilityScore,
        insightsCount: healthScore.insightsCount,
      },
      insightCount: insights.length,
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
