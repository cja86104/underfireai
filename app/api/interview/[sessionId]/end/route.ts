import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { createChatCompletion, type ChatMessage } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS, SCORING_WEIGHTS } from '@/lib/ai/config';
import { updateProgressAndAwardBadges } from '@/lib/progress/badge-service';
import type { ResponseAnalysis } from '@/types/database';

interface EndInterviewRequest {
  elapsed_seconds: number;
}

/** Parsed JSON structure from AI feedback generation */
interface ParsedEndSessionFeedback {
  strengths?: unknown[];
  improvements?: unknown[];
  interviewer_impression?: string;
  ai_feedback?: string;
  key_moments?: unknown[];
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

    const body = await request.json() as EndInterviewRequest;
    const { elapsed_seconds } = body;

    const supabase = await createClient();

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*, interviewers(name, backstory, personality_base)')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Interview session not found' },
        { status: 404 }
      );
    }

    // Get all messages for this session
    const { data: messages, error: messagesError } = await supabase
      .from('interview_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError || !messages) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to fetch interview messages for scoring' },
        { status: 500 }
      );
    }

    // Update session status
    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_seconds: elapsed_seconds,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to update session status' },
        { status: 500 }
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

      // Apply difficulty bonus: (difficulty - 5) * 2, range: -8 to +10
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

    const feedbackPrompt = `You are a senior interview coach who just watched this entire interview. Write feedback that proves it.

Interview Type: ${session.interview_type}
${session.target_role ? `Target Role: ${session.target_role}` : ''}
Difficulty: ${session.difficulty}/10

FULL TRANSCRIPT:
${conversationTranscript}

SCORES (calculated from per-answer analysis):
- Overall: ${scores.overall_score}%
- Clarity: ${scores.clarity_score}%
- Confidence: ${scores.confidence_score}%
- Technical Depth: ${scores.technical_depth}%
- STAR Usage: ${scores.star_usage_score}%
- Communication: ${scores.communication_score}%

RULES — read these before writing a single word:
1. Every strength must reference a specific answer or moment from the transcript above. Name the question or quote a phrase the candidate used. NEVER write a strength that could apply to any candidate.
2. Every improvement must identify a specific answer that fell short, quote or paraphrase what the candidate said, and explain exactly what was missing or weak about that specific answer. NEVER write generic advice like "use STAR more" or "quantify your achievements" without pointing to where in this interview that was a problem.
3. The interviewer_impression must sound like it came from THIS interviewer who just finished THIS conversation — not a generic evaluation template.
4. The ai_feedback must reference at least two specific exchanges from the transcript by question topic or candidate quote. It should feel like feedback from someone who was paying attention.
5. key_moments must identify real turning points — specific questions where the candidate either shone or stumbled. Reference what was said.
6. If the candidate did well overall, acknowledge it honestly — do not invent weaknesses.

Provide a JSON response with:
{
  "strengths": ["specific strength tied to a real answer in this interview", "..."],
  "improvements": ["specific improvement tied to a real answer that fell short", "..."],
  "interviewer_impression": "2-3 sentences from the interviewer's perspective about this specific candidate",
  "ai_feedback": "3-4 sentences referencing specific exchanges from this interview",
  "key_moments": [
    {"type": "strong|weak|turning_point", "description": "reference to a specific moment in the conversation"}
  ]
}

Return ONLY valid JSON, no markdown or additional text.`;

    let feedback = {
      strengths: ['Review your transcript for specific strengths'],
      improvements: ['Review your transcript for specific areas to improve'],
      interviewer_impression: 'Feedback could not be generated for this session. Please review your transcript.',
      ai_feedback: 'Feedback generation failed. Your transcript is saved and you can review it in the replay.',
      key_moments: [] as { type: string; description: string }[],
    };

    try {
      const aiMessages: ChatMessage[] = [
        { role: 'system', content: 'You are a direct, specific interview coach. You watched this entire interview. Reference what the candidate actually said. Generic advice is unacceptable. Return only valid JSON.' },
        { role: 'user', content: feedbackPrompt },
      ];

      const completion = await createChatCompletion(aiMessages, {
        model: AI_MODELS.ANALYSIS,
        ...MODEL_PARAMS.analysis,
      });

      let content = completion.choices[0]?.message?.content || '{}';

      // Strip markdown code fences if present
      content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

      const parsed = JSON.parse(content) as ParsedEndSessionFeedback;

      // Validate and sanitize parsed result
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
                typeof (m as Record<string, unknown>).description === 'string' &&
                ((m as Record<string, unknown>).description as string).length > 0
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
      // Use default feedback
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

    // MAJOR-07: Treat score save errors as fatal
    if (scoresError) {
      console.error('Error saving scores:', scoresError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to save session scores' },
        { status: 500 }
      );
    }

    // Update user_progress avg_score (DB trigger runs before scores are saved,
    // so the avg is stale) and award any newly earned badges.
    const newlyAwardedBadges = await updateProgressAndAwardBadges(
      supabase,
      user.id,
      sessionId,
      scores.overall_score > 0 ? scores.overall_score : null
    );

    return NextResponse.json({
      success: true,
      scores,
      feedback,
      newlyAwardedBadges,
      message: 'Interview completed and scored',
    });

  } catch (error) {
    console.error('Error ending interview:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
