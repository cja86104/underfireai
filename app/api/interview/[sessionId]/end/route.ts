import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createChatCompletion, type ChatMessage } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS } from '@/lib/ai/config';

interface EndInterviewRequest {
  elapsed_seconds: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const body: EndInterviewRequest = await request.json();
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

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
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
    }

    // Calculate scores from message analyses
    const candidateMessages = (messages || []).filter((m) => m.role === 'candidate');
    const analyses = candidateMessages
      .map((m) => m.analysis)
      .filter((a) => a !== null);

    let scores = {
      overall_score: 0,
      clarity_score: 0,
      confidence_score: 0,
      technical_depth: 0,
      star_usage_score: 0,
      communication_score: 0,
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
      scores = {
        clarity_score: Math.round(sum.clarity / count),
        confidence_score: Math.round(sum.confidence / count),
        technical_depth: Math.round(sum.depth / count),
        star_usage_score: Math.round(sum.star / count),
        communication_score: Math.round((sum.clarity + sum.relevance) / (count * 2)),
        overall_score: Math.round(
          (sum.clarity + sum.confidence + sum.depth + sum.star + sum.relevance) / (count * 5)
        ),
      };
    }

    // Generate AI feedback
    const conversationTranscript = (messages || [])
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

      const content = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      feedback = {
        strengths: parsed.strengths || feedback.strengths,
        improvements: parsed.improvements || feedback.improvements,
        interviewer_impression: parsed.interviewer_impression || feedback.interviewer_impression,
        ai_feedback: parsed.ai_feedback || feedback.ai_feedback,
        key_moments: parsed.key_moments || [],
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
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        ai_feedback: feedback.ai_feedback,
        interviewer_impression: feedback.interviewer_impression,
        key_moments: feedback.key_moments,
      });

    if (scoresError) {
      console.error('Error saving scores:', scoresError);
    }

    return NextResponse.json({
      success: true,
      scores,
      feedback,
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
