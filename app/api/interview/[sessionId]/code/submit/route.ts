import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { createChatCompletion, type ChatMessage } from '@/lib/ai/chat-client';
import { codeEvaluationSchema, type CodeEvaluation } from '@/types/coding';
import type { Json } from '@/types/database';

interface SubmitCodeRequest {
  code: string;
  language: string;
  challengeId: string;
  hintsUsed: number;
  timeSpent: number;
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
      .select('id, status, user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found' },
        { status: 404 }
      );
    }

    const body = await request.json() as SubmitCodeRequest;
    const { code, language, challengeId, hintsUsed, timeSpent } = body;

    // Fetch challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('coding_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Not found', message: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Get AI evaluation of the code
    const evaluation = await evaluateCode(
      code,
      language,
      challenge.title,
      challenge.description,
      hintsUsed,
      timeSpent,
      challenge.time_limit_seconds
    );

    // Save final submission
    const { data: submission, error: submissionError } = await supabase
      .from('code_submissions')
      .insert({
        session_id: sessionId,
        challenge_id: challengeId,
        language,
        code,
        status: 'submitted',
        hints_used: hintsUsed,
        execution_time_ms: timeSpent * 1000,
      })
      .select('id')
      .single();

    if (submissionError) {
      console.error('Error saving submission:', submissionError);
    }

    // Store evaluation in session message for the interview flow
    await supabase
      .from('interview_messages')
      .insert({
        session_id: sessionId,
        role: 'candidate',
        content: `[Code Submission]\nLanguage: ${language}\nHints Used: ${hintsUsed}\nTime Spent: ${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s\n\n\`\`\`${language}\n${code}\n\`\`\``,
        analysis: {
          star_score: evaluation.problemSolving,
          clarity_score: evaluation.codeQuality,
          confidence_score: evaluation.efficiency,
          relevance_score: evaluation.correctness,
          depth_score: Math.round((evaluation.correctness + evaluation.efficiency) / 2),
          word_count: code.split(/\s+/).length,
          filler_words: [],
          key_points: evaluation.suggestions,
        } as unknown as Json,
      });

    return NextResponse.json({
      success: true,
      submissionId: submission?.id,
      evaluation,
    });
  } catch (error) {
    console.error('Error submitting code:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to submit code' },
      { status: 500 }
    );
  }
}

async function evaluateCode(
  code: string,
  language: string,
  challengeTitle: string,
  challengeDescription: string,
  hintsUsed: number,
  timeSpent: number,
  timeLimit: number
): Promise<CodeEvaluation> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a senior software engineer evaluating a coding interview solution. Provide a detailed technical assessment.

You MUST respond with ONLY a valid JSON object matching this exact structure:
{
  "correctness": 0-100,
  "efficiency": 0-100,
  "codeQuality": 0-100,
  "problemSolving": 0-100,
  "feedback": "detailed feedback string",
  "suggestions": ["suggestion 1", "suggestion 2"],
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)"
}

Consider:
- Correctness: Does the solution solve the problem correctly?
- Efficiency: Is the solution optimally efficient?
- Code Quality: Is the code clean, readable, and well-structured?
- Problem Solving: Does it demonstrate good algorithmic thinking?

Hints used and time spent affect scoring:
- Each hint used reduces the problem solving score by 10%
- Taking more than 80% of the time limit reduces efficiency score slightly`,
    },
    {
      role: 'user',
      content: `## Challenge: ${challengeTitle}

${challengeDescription}

## Submitted Solution (${language}):
\`\`\`${language}
${code}
\`\`\`

## Context:
- Hints Used: ${hintsUsed}
- Time Spent: ${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s
- Time Limit: ${Math.floor(timeLimit / 60)}m

Evaluate this solution and provide your assessment as JSON.`,
    },
  ];

  try {
    const completion = await createChatCompletion(messages, {
      temperature: 0.3,
      max_tokens: 1024,
    });

    const responseContent = completion.choices[0]?.message?.content ?? '{}';
    const cleaned = responseContent.replace(/```json\n?|\n?```/g, '');
    const parsed: unknown = JSON.parse(cleaned);

    // Validate with Zod
    const validated = codeEvaluationSchema.parse(parsed);

    // Apply hint penalty
    if (hintsUsed > 0) {
      validated.problemSolving = Math.max(0, validated.problemSolving - hintsUsed * 10);
    }

    return validated;
  } catch (error) {
    console.error('Evaluation error:', error);
    // Return default evaluation on error
    return {
      correctness: 50,
      efficiency: 50,
      codeQuality: 50,
      problemSolving: 50,
      feedback: 'Unable to fully evaluate the solution. Please review manually.',
      suggestions: ['Consider edge cases', 'Add comments to explain your approach'],
      timeComplexity: 'Unknown',
      spaceComplexity: 'Unknown',
    };
  }
}
