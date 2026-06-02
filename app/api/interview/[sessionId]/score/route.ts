import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { createChatCompletion, type ChatMessage } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS, SCORING_WEIGHTS } from '@/lib/ai/config';
import { sendSessionCompletedWebhook } from '@/lib/webhooks';
import { generateAndSaveAlignmentAnalysis } from '@/lib/resume/insights-service';
import { updateProgressAndAwardBadges } from '@/lib/progress/badge-service';
import type { ResponseAnalysis } from '@/types/database';

/** Parsed JSON structure from AI feedback generation */
interface ParsedScoreFeedback {
  strengths?: unknown[];
  improvements?: unknown[];
  interviewer_impression?: string;
  ai_feedback?: string;
  key_moments?: unknown[];
}

export async function POST(
  _request: NextRequest,
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
      .select('*, interviewers(name, backstory)')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Interview session not found' },
        { status: 404 }
      );
    }

    // Check if already scored
    const { data: existingScore } = await supabase
      .from('session_scores')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (existingScore) {
      // Return existing score
      const { data: fullScore } = await supabase
        .from('session_scores')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      return NextResponse.json({
        success: true,
        alreadyScored: true,
        scores: {
          overall_score: fullScore?.overall_score,
          clarity_score: fullScore?.clarity_score,
          confidence_score: fullScore?.confidence_score,
          technical_depth: fullScore?.technical_depth,
          star_usage_score: fullScore?.star_usage_score,
          communication_score: fullScore?.communication_score,
        },
        feedback: {
          strengths: fullScore?.strengths,
          improvements: fullScore?.improvements,
          ai_feedback: fullScore?.ai_feedback,
          interviewer_impression: fullScore?.interviewer_impression,
          key_moments: fullScore?.key_moments,
        },
      });
    }

    // Get all messages for this session
    const { data: messages, error: messagesError } = await supabase
      .from('interview_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No data', message: 'No messages found for this session' },
        { status: 400 }
      );
    }

    // Calculate scores from message analyses
    const candidateMessages = messages.filter((m) => m.role === 'candidate');
    const analyses = candidateMessages
      .map((m) => m.analysis as ResponseAnalysis | null)
      .filter((a): a is ResponseAnalysis => a !== null);

    let scores = {
      overall_score: 0,
      clarity_score: 0,
      confidence_score: 0,
      technical_depth: 0,
      star_usage_score: 0,
      communication_score: 0,
      relevance_score: 0,
    };

    if (analyses.length > 0) {
      const sum = analyses.reduce(
        (acc, a) => ({
          clarity: acc.clarity + (a.clarity_score || 0),
          confidence: acc.confidence + (a.confidence_score || 0),
          depth: acc.depth + (a.depth_score || 0),
          star: acc.star + (a.star_score || 0),
          relevance: acc.relevance + (a.relevance_score || 0),
        }),
        { clarity: 0, confidence: 0, depth: 0, star: 0, relevance: 0 }
      );

      const count = analyses.length;
      const avgClarity = sum.clarity / count;
      const avgConfidence = sum.confidence / count;
      const avgDepth = sum.depth / count;
      const avgStar = sum.star / count;
      const avgRelevance = sum.relevance / count;
      const avgCommunication = (avgClarity + avgRelevance) / 2;

      // Select weight set based on interview type
      const interviewType = session.interview_type as keyof typeof SCORING_WEIGHTS;
      const weights = SCORING_WEIGHTS[interviewType] || SCORING_WEIGHTS.overall;

      const weightedOverall =
        avgClarity * weights.clarity +
        avgConfidence * weights.confidence +
        avgDepth * weights.depth +
        avgStar * weights.star_usage +
        avgRelevance * weights.relevance +
        avgCommunication * weights.communication;

      // Apply difficulty bonus
      const difficultyBonus = (session.difficulty - 5) * 2;
      const adjustedOverall = Math.min(100, Math.max(0, Math.round(weightedOverall + difficultyBonus)));

      scores = {
        clarity_score: Math.round(avgClarity),
        confidence_score: Math.round(avgConfidence),
        technical_depth: Math.round(avgDepth),
        star_usage_score: Math.round(avgStar),
        communication_score: Math.round(avgCommunication),
        relevance_score: Math.round(avgRelevance),
        overall_score: adjustedOverall,
      };
    }

    // Generate AI feedback
    const conversationTranscript = messages
      .map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
      .join('\n\n');

    const feedbackPrompt = `You are an expert interview coach. Analyze this interview transcript and provide feedback.

Interview Type: ${session.interview_type}
${session.target_role ? `Target Role: ${session.target_role}` : ''}
Difficulty: ${session.difficulty}/10

TRANSCRIPT:
${conversationTranscript}

CALCULATED SCORES:
- Overall: ${scores.overall_score}%
- Clarity: ${scores.clarity_score}%
- Confidence: ${scores.confidence_score}%
- Technical Depth: ${scores.technical_depth}%
- STAR Usage: ${scores.star_usage_score}%
- Communication: ${scores.communication_score}%

Provide a JSON response with:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "interviewer_impression": "A 2-3 sentence summary of how the interviewer likely perceived the candidate",
  "ai_feedback": "A 3-4 sentence overall assessment with specific, actionable advice",
  "key_moments": [
    {"type": "strong|weak|turning_point", "description": "brief description"}
  ]
}

Return ONLY valid JSON, no markdown or additional text.`;

    let feedback = {
      strengths: ['Good communication', 'Showed enthusiasm', 'Answered questions directly'],
      improvements: ['Provide more specific examples', 'Use STAR format more consistently', 'Quantify achievements when possible'],
      interviewer_impression: 'The candidate showed potential but could strengthen their responses with more concrete examples.',
      ai_feedback: 'Overall solid interview performance. Focus on structuring answers using the STAR method and providing measurable outcomes from your experiences.',
      key_moments: [] as { type: string; description: string }[],
    };

    try {
      const aiMessages: ChatMessage[] = [
        { role: 'system', content: 'You are an expert interview coach providing structured feedback. Return only valid JSON.' },
        { role: 'user', content: feedbackPrompt },
      ];

      const completion = await createChatCompletion(aiMessages, {
        model: AI_MODELS.ANALYSIS,
        ...MODEL_PARAMS.analysis,
      });

      let content = completion.choices[0]?.message?.content || '{}';
      content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

      const parsed = JSON.parse(content) as ParsedScoreFeedback;

      const validatedStrengths: string[] = Array.isArray(parsed.strengths)
        ? parsed.strengths.filter((s): s is string => typeof s === 'string' && s.length > 0).slice(0, 10)
        : feedback.strengths;
      const validatedImprovements: string[] = Array.isArray(parsed.improvements)
        ? parsed.improvements.filter((s): s is string => typeof s === 'string' && s.length > 0).slice(0, 10)
        : feedback.improvements;
      const validatedKeyMoments: { type: string; description: string }[] = Array.isArray(parsed.key_moments)
        ? parsed.key_moments
            .filter(
              (m): m is { type: string; description: string } =>
                typeof m === 'object' &&
                m !== null &&
                typeof (m as Record<string, unknown>).type === 'string' &&
                typeof (m as Record<string, unknown>).description === 'string'
            )
            .slice(0, 20)
        : [];

      feedback = {
        strengths: validatedStrengths.length > 0 ? validatedStrengths : feedback.strengths,
        improvements: validatedImprovements.length > 0 ? validatedImprovements : feedback.improvements,
        interviewer_impression:
          typeof parsed.interviewer_impression === 'string' && parsed.interviewer_impression.length > 0
            ? parsed.interviewer_impression
            : feedback.interviewer_impression,
        ai_feedback:
          typeof parsed.ai_feedback === 'string' && parsed.ai_feedback.length > 0
            ? parsed.ai_feedback
            : feedback.ai_feedback,
        key_moments: validatedKeyMoments,
      };
    } catch (aiError) {
      console.error('Error generating AI feedback:', aiError);
    }

    // Save session scores
    const { error: scoresError } = await supabase
      .from('session_scores')
      .insert({
        session_id: sessionId,
        overall_score: scores.overall_score,
        clarity_score: scores.clarity_score,
        confidence_score: scores.confidence_score,
        technical_depth: scores.technical_depth,
        star_usage_score: scores.star_usage_score,
        communication_score: scores.communication_score,
        relevance_score: scores.relevance_score,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        ai_feedback: feedback.ai_feedback,
        interviewer_impression: feedback.interviewer_impression,
        key_moments: feedback.key_moments,
      });

    if (scoresError) {
      console.error('Error saving scores:', scoresError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to save scores' },
        { status: 500 }
      );
    }

    // Update user_progress avg_score (the DB trigger runs before scores are
    // saved, so avg is stale) and evaluate + award any newly earned badges.
    const newlyAwardedBadges = await updateProgressAndAwardBadges(
      supabase,
      user.id,
      sessionId,
      scores.overall_score > 0 ? scores.overall_score : null
    );

    // Send webhook notification. Awaits every configured endpoint so the
    // webhook_sent flag we write below reflects actual delivery state.
    const webhookResult = await sendSessionCompletedWebhook({
      session_id: sessionId,
      user_id: user.id,
      interview_type: session.interview_type,
      target_role: session.target_role,
      target_company: session.target_company,
      difficulty: session.difficulty,
      duration_seconds: session.duration_seconds,
      started_at: session.started_at,
      ended_at: session.ended_at,
      scores: {
        overall_score: scores.overall_score,
        clarity_score: scores.clarity_score,
        confidence_score: scores.confidence_score,
        technical_depth: scores.technical_depth,
        star_usage_score: scores.star_usage_score,
        communication_score: scores.communication_score,
      },
      feedback: {
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        ai_feedback: feedback.ai_feedback,
        interviewer_impression: feedback.interviewer_impression,
      },
    });

    // Update session_scores with webhook status. Only record success when at
    // least one configured endpoint actually delivered — previously this was
    // set to true on dispatch, so persistent delivery failures were invisible.
    if (webhookResult.successCount > 0) {
      await supabase
        .from('session_scores')
        .update({
          webhook_sent: true,
          webhook_sent_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId);
    }

    // Generate resume alignment analysis for paid users (async, non-blocking)
    let resumeAlignmentGenerated = false;
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profile && profile.subscription_tier !== 'free') {
      // Run alignment analysis in background - don't await to avoid blocking response
      generateAndSaveAlignmentAnalysis(
        user.id,
        sessionId,
        messages.map((m) => ({
          role: m.role,
          content: m.content,
          analysis: m.analysis as ResponseAnalysis | null,
        })),
        scores,
        session.interview_type,
        session.target_role
      ).catch((err: unknown) => {
        console.error('Error generating resume alignment:', err);
      });
      resumeAlignmentGenerated = true;
    }

    return NextResponse.json({
      success: true,
      alreadyScored: false,
      scores,
      feedback,
      newlyAwardedBadges,
      messageCount: messages.length,
      candidateResponseCount: candidateMessages.length,
      analyzedResponseCount: analyses.length,
      webhookSent: webhookResult.sent,
      webhookCount: webhookResult.webhookCount,
      resumeAlignmentTriggered: resumeAlignmentGenerated,
    });

  } catch (error) {
    console.error('Error scoring session:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to score session' },
      { status: 500 }
    );
  }
}

// GET to retrieve existing score
export async function GET(
  _request: NextRequest,
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
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Interview session not found' },
        { status: 404 }
      );
    }

    // Get score
    const { data: score, error: scoreError } = await supabase
      .from('session_scores')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (scoreError || !score) {
      return NextResponse.json(
        { error: 'Not found', message: 'Score not found for this session' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      scores: {
        overall_score: score.overall_score,
        clarity_score: score.clarity_score,
        confidence_score: score.confidence_score,
        technical_depth: score.technical_depth,
        star_usage_score: score.star_usage_score,
        communication_score: score.communication_score,
        relevance_score: score.relevance_score,
      },
      feedback: {
        strengths: score.strengths,
        improvements: score.improvements,
        ai_feedback: score.ai_feedback,
        interviewer_impression: score.interviewer_impression,
        key_moments: score.key_moments,
      },
      createdAt: score.created_at,
    });

  } catch (error) {
    console.error('Error fetching score:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to fetch score' },
      { status: 500 }
    );
  }
}
