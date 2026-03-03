import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import {
  generateAndSaveAlignmentAnalysis,
  getSessionInsight,
} from '@/lib/resume/insights-service';
import type { ResponseAnalysis } from '@/types/database';

/**
 * POST /api/resume/analyze-alignment
 *
 * Analyzes alignment between user's resume and a completed interview session.
 * Returns discrepancies, confirmations, and suggestions.
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

    // Check if user has purchased (free users don't get this feature)
    const subscription = await getSubscriptionStatus();

    if (!subscription.hasPurchased) {
      return NextResponse.json(
        {
          error: 'Purchase required',
          message: 'Resume alignment analysis is available after purchasing interview credits',
        },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const body = (await request.json()) as { sessionId?: string };
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Check if already analyzed
    const existing = await getSessionInsight(user.id, sessionId);
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyAnalyzed: true,
        insight: {
          alignmentScore: existing.alignmentScore,
          discrepancies: existing.discrepancies,
          confirmations: existing.confirmations,
          suggestions: existing.resumeSuggestions,
        },
      });
    }

    // Fetch session data
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('id, interview_type, target_role, user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Completed session not found' },
        { status: 404 }
      );
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('interview_messages')
      .select('role, content, analysis')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No data', message: 'No messages found for this session' },
        { status: 400 }
      );
    }

    // Fetch scores
    const { data: scores, error: scoresError } = await supabase
      .from('session_scores')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (scoresError || !scores) {
      return NextResponse.json(
        { error: 'No scores', message: 'Session has not been scored yet' },
        { status: 400 }
      );
    }

    // Generate alignment analysis
    const insight = await generateAndSaveAlignmentAnalysis(
      user.id,
      sessionId,
      messages.map((m) => ({
        role: m.role,
        content: m.content,
        analysis: m.analysis as ResponseAnalysis | null,
      })),
      {
        overall_score: scores.overall_score ?? 0,
        clarity_score: scores.clarity_score ?? 0,
        confidence_score: scores.confidence_score ?? 0,
        technical_depth: scores.technical_depth ?? 0,
        star_usage_score: scores.star_usage_score ?? 0,
        communication_score: scores.communication_score ?? 0,
      },
      session.interview_type,
      session.target_role
    );

    if (!insight) {
      return NextResponse.json(
        {
          error: 'Analysis failed',
          message: 'Could not generate alignment analysis. Do you have a resume uploaded?',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyAnalyzed: false,
      insight: {
        id: insight.id,
        alignmentScore: insight.alignmentScore,
        discrepancies: insight.discrepancies,
        confirmations: insight.confirmations,
        suggestions: insight.resumeSuggestions,
      },
    });
  } catch (error) {
    console.error('Error analyzing alignment:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to analyze alignment' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resume/analyze-alignment?sessionId=xxx
 *
 * Get existing alignment analysis for a session.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'sessionId is required' },
        { status: 400 }
      );
    }

    const insight = await getSessionInsight(user.id, sessionId);

    if (!insight) {
      return NextResponse.json(
        { error: 'Not found', message: 'No alignment analysis found for this session' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      insight: {
        id: insight.id,
        alignmentScore: insight.alignmentScore,
        discrepancies: insight.discrepancies,
        confirmations: insight.confirmations,
        suggestions: insight.resumeSuggestions,
        createdAt: insight.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching alignment:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to fetch alignment analysis' },
      { status: 500 }
    );
  }
}
