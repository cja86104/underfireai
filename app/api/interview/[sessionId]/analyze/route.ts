import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { analyzeResponse } from '@/lib/ai/chat-client';
import type { Json } from '@/types/database';

interface AnalyzeRequest {
  response: string;
  question: string;
  interviewType: string;
  messageId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('id, user_id, interview_type')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Interview session not found' },
        { status: 404 }
      );
    }

    // Rate-limit per user. Each call is a Mistral analysis; a loop over the
    // same answer burns tokens without producing new signal.
    const rl = await checkRateLimit('analyze', user.id);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit', message: 'Too many analysis requests. Please wait a moment.' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const body = await request.json() as AnalyzeRequest;
    const { response, question, interviewType, messageId } = body;

    if (!response || !question) {
      return NextResponse.json(
        { error: 'Validation error', message: 'response and question are required' },
        { status: 400 }
      );
    }

    // Analyze the response
    const analysis = await analyzeResponse(
      response,
      question,
      interviewType ?? session.interview_type
    );

    // If messageId provided, update the message with analysis
    if (messageId) {
      const { error: updateError } = await supabase
        .from('interview_messages')
        .update({ analysis: analysis as unknown as Json })
        .eq('id', messageId)
        .eq('session_id', sessionId);

      if (updateError) {
        console.error('Error updating message analysis:', updateError);
      }
    }

    // Calculate overall score
    const overallScore = Math.round(
      (analysis.star_score * 0.25) +
      (analysis.clarity_score * 0.20) +
      (analysis.confidence_score * 0.15) +
      (analysis.relevance_score * 0.25) +
      (analysis.depth_score * 0.15)
    );

    // Generate quick feedback based on scores
    const feedback: string[] = [];

    if (analysis.star_score < 50) {
      feedback.push('Consider using STAR format: Situation, Task, Action, Result');
    }
    if (analysis.clarity_score < 50) {
      feedback.push('Try to structure your answer more clearly');
    }
    if (analysis.relevance_score < 60) {
      feedback.push('Make sure to directly address the question asked');
    }
    if (analysis.depth_score < 50) {
      feedback.push('Add more specific details and examples');
    }
    if (analysis.filler_words.length > 3) {
      feedback.push(`Reduce filler words: ${analysis.filler_words.slice(0, 3).join(', ')}`);
    }

    // Identify strengths
    const strengths: string[] = [];
    if (analysis.star_score >= 75) strengths.push('Strong STAR format usage');
    if (analysis.clarity_score >= 75) strengths.push('Clear and well-structured');
    if (analysis.confidence_score >= 75) strengths.push('Confident delivery');
    if (analysis.relevance_score >= 75) strengths.push('Directly addressed the question');
    if (analysis.depth_score >= 75) strengths.push('Good level of detail');

    return NextResponse.json({
      analysis,
      overallScore,
      feedback,
      strengths,
      keyPoints: analysis.key_points,
      wordCount: analysis.word_count,
      messageId: messageId ?? null,
    });

  } catch (error) {
    console.error('Error analyzing response:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to analyze response' },
      { status: 500 }
    );
  }
}
