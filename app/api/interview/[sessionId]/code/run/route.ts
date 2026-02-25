import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { createChatCompletion, type ChatMessage } from '@/lib/ai/chat-client';
import type { TestResult } from '@/types/coding';
import type { Json } from '@/types/database';

interface RunCodeRequest {
  code: string;
  language: string;
  challengeId: string;
}

interface TestCase {
  input: string;
  expected: string;
  hidden: boolean;
}

interface AIEvaluationResponse {
  results?: TestResult[];
  error?: string;
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

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Invalid state', message: 'Session is not active' },
        { status: 400 }
      );
    }

    const body = await request.json() as RunCodeRequest;
    const { code, language, challengeId } = body;

    // Fetch challenge with test cases
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

    const testCases = challenge.test_cases as unknown as TestCase[];

    // Use AI to evaluate the code against test cases
    // This is a simplified evaluation - in production, you'd use a proper sandbox
    const evaluationPrompt = buildEvaluationPrompt(code, language, testCases);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a code evaluator. Your task is to analyze code and determine if it would produce the expected output for given test cases.

IMPORTANT: You must respond with ONLY a valid JSON object, no markdown, no explanation. The JSON should have this exact structure:
{
  "results": [
    {
      "passed": true,
      "input": "the input",
      "expected": "expected output",
      "actual": "what the code would output",
      "timeMs": 5
    }
  ],
  "error": null
}

Be realistic about what the code would actually produce. If the code has syntax errors or bugs, indicate that in the actual output or error field.`,
      },
      { role: 'user', content: evaluationPrompt },
    ];

    const completion = await createChatCompletion(messages, {
      temperature: 0.1,
      max_tokens: 2048,
    });

    const responseContent = completion.choices[0]?.message?.content ?? '{}';

    // Parse the AI response
    let testResults: TestResult[];
    try {
      const parsed = JSON.parse(responseContent.replace(/```json\n?|\n?```/g, '')) as AIEvaluationResponse;
      testResults = parsed.results ?? [];

      // Add error to all results if there's a global error
      if (parsed.error) {
        testResults = testCases.slice(0, 3).map((tc) => ({
          passed: false,
          input: tc.input,
          expected: tc.expected,
          actual: '',
          error: parsed.error,
        }));
      }
    } catch {
      // Fallback if AI response isn't valid JSON
      testResults = testCases.slice(0, 3).map((tc) => ({
        passed: false,
        input: tc.input,
        expected: tc.expected,
        actual: 'Evaluation error',
        error: 'Failed to evaluate code',
      }));
    }

    // Save the submission
    await supabase
      .from('code_submissions')
      .insert({
        session_id: sessionId,
        challenge_id: challengeId,
        language,
        code,
        status: testResults.every((r) => r.passed) ? 'passed' : 'failed',
        test_results: testResults as unknown as Json,
      });

    return NextResponse.json({
      status: testResults.every((r) => r.passed) ? 'passed' : 'failed',
      testResults,
      executionTimeMs: testResults.reduce((sum, r) => sum + (r.timeMs ?? 0), 0),
    });
  } catch (error) {
    console.error('Error running code:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to run code' },
      { status: 500 }
    );
  }
}

function buildEvaluationPrompt(
  code: string,
  language: string,
  testCases: TestCase[]
): string {
  // Only evaluate visible test cases
  const visibleCases = testCases.filter((tc) => !tc.hidden).slice(0, 3);

  return `Evaluate this ${language} code against the following test cases.

## Code:
\`\`\`${language}
${code}
\`\`\`

## Test Cases:
${visibleCases.map((tc, i) => `
Test ${i + 1}:
- Input: ${tc.input}
- Expected Output: ${tc.expected}
`).join('\n')}

Analyze the code and determine what output it would produce for each test case. Consider:
1. Syntax errors
2. Logic errors
3. Edge cases
4. Return type/format

Respond with ONLY a JSON object containing the results array.`;
}
