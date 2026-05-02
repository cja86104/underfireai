import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { createChatCompletion } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS } from '@/lib/ai/config';

interface CoachingRequestBody {
  question: string;
  answer: string;
  scores: {
    star_score: number;
    clarity_score: number;
    confidence_score: number;
    relevance_score: number;
    depth_score: number;
  };
  interviewType: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Verify the session belongs to this user before burning AI credits
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Interview session not found' },
        { status: 404 }
      );
    }

    // Rate-limit per user. Coaching invokes the Mistral analysis model per
    // call; a looped invocation with the same answer text burns tokens.
    const rl = await checkRateLimit('coaching', user.id);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit', message: 'Too many coaching requests. Please wait a moment.' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const body = (await request.json()) as CoachingRequestBody;
    const { question, answer, scores, interviewType } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: 'Missing question or answer' }, { status: 400 });
    }

    // Identify the weakest dimension to focus the coaching on
    const dimensions = [
      { key: 'star', score: scores.star_score, label: 'STAR structure' },
      { key: 'clarity', score: scores.clarity_score, label: 'clarity and structure' },
      { key: 'confidence', score: scores.confidence_score, label: 'confidence' },
      { key: 'relevance', score: scores.relevance_score, label: 'relevance to the question' },
      { key: 'depth', score: scores.depth_score, label: 'depth and specificity' },
    ].sort((a, b) => a.score - b.score);

    const primaryWeakness = dimensions[0];

    // Only generate a coaching note if there's actually something to improve
    if (primaryWeakness.score >= 72) {
      return NextResponse.json({ coachingNote: null });
    }

    const focusAreas = dimensions
      .filter((d) => d.score < 70)
      .map((d) => `${d.label} (${d.score}/100)`)
      .join(', ');

    const prompt = `You are a senior interview coach reviewing a candidate's answer.

Interview Type: ${interviewType.replace(/_/g, ' ')}

Question asked: "${question}"

Candidate's answer: "${answer}"

Scores for this answer:
- STAR Structure: ${scores.star_score}/100
- Clarity: ${scores.clarity_score}/100  
- Confidence: ${scores.confidence_score}/100
- Relevance: ${scores.relevance_score}/100
- Depth/Specificity: ${scores.depth_score}/100

Weakest area(s): ${focusAreas}

Write a specific coaching note (3-5 sentences) that:
1. References something SPECIFIC from their actual answer (quote or paraphrase a phrase they used)
2. Explains precisely why that part weakened the response
3. Gives a concrete rewrite example or specific technique to fix it — not generic advice

Do NOT be generic. Do NOT say "use the STAR method" without explaining exactly where their answer broke down. Directly reference what they said.

Return only the coaching note text, no labels or preamble.`;

    const completion = await createChatCompletion(
      [
        {
          role: 'system',
          content: 'You are a direct, specific interview coach. Reference the candidate\'s actual words. Never give generic advice.',
        },
        { role: 'user', content: prompt },
      ],
      {
        model: AI_MODELS.ANALYSIS,
        ...MODEL_PARAMS.analysis,
        max_tokens: 400,
      }
    );

    const coachingNote = completion.choices[0]?.message?.content?.trim() ?? null;

    return NextResponse.json({ coachingNote, sessionId });
  } catch (error) {
    console.error('Error generating coaching note:', error);
    return NextResponse.json({ error: 'Failed to generate coaching note' }, { status: 500 });
  }
}
