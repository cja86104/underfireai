import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { createChatCompletion, type ChatMessage } from '@/lib/ai/chat-client';
import { AI_MODELS } from '@/lib/ai/config';
import type { NegotiationSessionUpdate } from '@/types/database';
import { SIMULATION_DISCLAIMER } from '@/lib/negotiation/disclaimer';

interface EndNegotiationRequest {
  elapsed_seconds: number;
}

interface ParsedNegotiationFeedback {
  overall_score?: unknown;
  confidence_score?: unknown;
  framing_score?: unknown;
  strategy_score?: unknown;
  composure_score?: unknown;
  final_simulated_offer?: unknown;
  key_tactics_used?: unknown[];
  improvements?: unknown[];
  ai_feedback?: unknown;
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

    const body = await request.json() as EndNegotiationRequest;
    const { elapsed_seconds } = body;

    // Validate elapsed_seconds: must be a finite non-negative number.
    // A missing, negative, or non-numeric value is stored as null rather than
    // writing garbage into duration_seconds.
    const elapsedSeconds: number | null =
      typeof elapsed_seconds === 'number' &&
      isFinite(elapsed_seconds) &&
      elapsed_seconds >= 0
        ? Math.round(elapsed_seconds)
        : null;

    const supabase = await createClient();

    // ── Load session ────────────────────────────────────────────────────────
    const { data: session, error: sessionError } = await supabase
      .from('negotiation_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Negotiation session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Already ended', message: 'This session has already been completed' },
        { status: 409 }
      );
    }

    // ── Load messages ───────────────────────────────────────────────────────
    const { data: messages, error: messagesError } = await supabase
      .from('negotiation_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages for scoring:', messagesError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to load messages for scoring' },
        { status: 500 }
      );
    }

    // ── Mark session ended immediately (before AI) ──────────────────────────
    const { error: updateError } = await supabase
      .from('negotiation_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_seconds: elapsedSeconds,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error marking session completed:', updateError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to update session status' },
        { status: 500 }
      );
    }

    // ── Build transcript for AI scoring ────────────────────────────────────
    const transcript = (messages ?? [])
      .map(m => `${m.role === 'user' ? 'Candidate' : 'Recruiter'}: ${m.content}`)
      .join('\n\n');

    const currentFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0,
    }).format(session.current_offer_amount);

    const targetFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0,
    }).format(session.target_amount);

    const feedbackPrompt = `You are an expert salary negotiation coach. Analyse the following negotiation transcript and score the candidate's performance.

Role: ${session.target_role}${session.company_name ? ` at ${session.company_name}` : ''}
Starting offer: ${currentFormatted}
Candidate's target: ${targetFormatted}
${session.experience_years !== null ? `Candidate experience: ${session.experience_years} years` : ''}

TRANSCRIPT:
${transcript || '(No messages exchanged)'}

Score the candidate on each dimension from 0–100. Estimate the final offer the recruiter would have agreed to based on how the negotiation went (use null if no negotiation occurred).

Return ONLY valid JSON in this exact shape:
{
  "overall_score": 0-100,
  "confidence_score": 0-100,
  "framing_score": 0-100,
  "strategy_score": 0-100,
  "composure_score": 0-100,
  "final_simulated_offer": number or null,
  "key_tactics_used": ["tactic 1", "tactic 2"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "ai_feedback": "3-4 sentence overall assessment with specific, actionable advice"
}`;

    // ── Default fallback feedback ───────────────────────────────────────────
    let feedback = {
      overall_score: 50,
      confidence_score: 50,
      framing_score: 50,
      strategy_score: 50,
      composure_score: 50,
      final_simulated_offer: null as number | null,
      key_tactics_used: [] as string[],
      improvements: [
        'Anchor with a specific number early in the conversation',
        'Use market data and competing offers to justify your target',
        'Stay calm and confident when the recruiter pushes back',
      ],
      ai_feedback: 'Complete a negotiation session to receive personalised feedback on your technique.',
    };

    try {
      const aiMessages: ChatMessage[] = [
        { role: 'system', content: 'You are an expert salary negotiation coach. Return only valid JSON.' },
        { role: 'user', content: feedbackPrompt },
      ];

      const completion = await createChatCompletion(aiMessages, {
        model: AI_MODELS.ANALYSIS,
        temperature: 0.3,
        max_tokens: 800,
      });

      let content = completion.choices[0]?.message?.content ?? '{}';
      content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

      const parsed = JSON.parse(content) as ParsedNegotiationFeedback;

      const toScore = (val: unknown, fallback: number): number => {
        if (typeof val !== 'number') return fallback;
        return Math.min(100, Math.max(0, Math.round(val)));
      };

      const toOffer = (val: unknown): number | null => {
        if (typeof val !== 'number' || val <= 0) return null;
        return Math.round(val);
      };

      const toStringArray = (val: unknown, fallback: string[]): string[] => {
        if (!Array.isArray(val)) return fallback;
        const filtered = val.filter((s): s is string => typeof s === 'string' && s.length > 0).slice(0, 10);
        return filtered.length > 0 ? filtered : fallback;
      };

      feedback = {
        overall_score: toScore(parsed.overall_score, 50),
        confidence_score: toScore(parsed.confidence_score, 50),
        framing_score: toScore(parsed.framing_score, 50),
        strategy_score: toScore(parsed.strategy_score, 50),
        composure_score: toScore(parsed.composure_score, 50),
        final_simulated_offer: toOffer(parsed.final_simulated_offer),
        key_tactics_used: toStringArray(parsed.key_tactics_used, []),
        improvements: toStringArray(parsed.improvements, feedback.improvements),
        ai_feedback:
          typeof parsed.ai_feedback === 'string' && parsed.ai_feedback.length > 0
            ? parsed.ai_feedback
            : feedback.ai_feedback,
      };
    } catch (aiError) {
      console.error('Error generating negotiation feedback:', aiError);
      // Fall through to default feedback
    }

    // ── Save feedback to session ────────────────────────────────────────────
    const update: NegotiationSessionUpdate = {
      overall_score: feedback.overall_score,
      confidence_score: feedback.confidence_score,
      framing_score: feedback.framing_score,
      strategy_score: feedback.strategy_score,
      composure_score: feedback.composure_score,
      final_simulated_offer: feedback.final_simulated_offer,
      key_tactics_used: feedback.key_tactics_used,
      improvements: feedback.improvements,
      ai_feedback: feedback.ai_feedback,
    };

    const { error: scoreError } = await supabase
      .from('negotiation_sessions')
      .update(update)
      .eq('id', sessionId);

    if (scoreError) {
      console.error('Error saving negotiation scores:', scoreError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to save session scores' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      scores: {
        overall_score: feedback.overall_score,
        confidence_score: feedback.confidence_score,
        framing_score: feedback.framing_score,
        strategy_score: feedback.strategy_score,
        composure_score: feedback.composure_score,
      },
      final_simulated_offer: feedback.final_simulated_offer,
      key_tactics_used: feedback.key_tactics_used,
      improvements: feedback.improvements,
      ai_feedback: feedback.ai_feedback,
      message: 'Negotiation session completed and scored',
      disclaimer: SIMULATION_DISCLAIMER,
    });
  } catch (error) {
    console.error('Error ending negotiation session:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
