import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { createChatCompletion, type ChatMessage } from '@/lib/ai/chat-client';
import {
  submitCode,
  createSubmission,
  isJudge0Configured,
  isRuntimeError,
  getStatusMessage,
  JUDGE0_STATUS,
} from '@/lib/code-execution';
import {
  generateSimpleWrapper,
  generateTestHarness,
  extractFunctionName,
  extractAnyFunctionName,
  hasNativeJsonSupport,
} from '@/lib/code-execution/language-wrappers';
import { codeEvaluationSchema, type CodeEvaluation, type TestResult, type ProgrammingLanguage } from '@/types/coding';
import type { Json } from '@/types/database';

interface SubmitCodeRequest {
  code: string;
  language: string;
  challengeId: string;
  hintsUsed: number;
  timeSpent: number;
}

interface TestCase {
  input: string;
  expected: string;
  hidden: boolean;
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

    // Check Judge0 configuration
    if (!isJudge0Configured()) {
      return NextResponse.json(
        { error: 'Configuration error', message: 'Code execution service is not configured' },
        { status: 503 }
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

    // Validate language
    const validLanguages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'cpp'];
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language', message: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }

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

    // Get ALL test cases (including hidden) for final submission
    const allTestCases = challenge.test_cases as unknown as TestCase[];

    // Extract function name from starter code or user code
    const starterCode = challenge.starter_code as Record<string, string> | null;
    const languageStarterCode = starterCode?.[language] ?? '';

    // Try multiple extraction strategies
    let functionName = extractFunctionName(languageStarterCode, language as ProgrammingLanguage);

    // Fallback 1: Try extracting from user's submitted code
    functionName ??= extractFunctionName(code, language as ProgrammingLanguage);

    // Fallback 2: Try generic pattern matching
    functionName ??= extractAnyFunctionName(code, language as ProgrammingLanguage);

    // Fallback 3: Try extracting from starter code with generic patterns
    if (!functionName && languageStarterCode) {
      functionName = extractAnyFunctionName(languageStarterCode, language as ProgrammingLanguage);
    }

    if (!functionName) {
      return NextResponse.json(
        {
          error: 'Parse error',
          message: 'Could not detect function name in code. Ensure your solution defines a function (e.g., "function solution()" or "def solution()").'
        },
        { status: 400 }
      );
    }

    // Execute ALL test cases via Judge0
    const testResults: TestResult[] = [];
    let totalTimeMs = 0;

    for (const testCase of allTestCases) {
      try {
        const result = await executeTestCase(
          code,
          language as ProgrammingLanguage,
          functionName,
          testCase
        );
        testResults.push(result);
        totalTimeMs += result.timeMs ?? 0;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Execution failed';
        testResults.push({
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          actual: '',
          error: errorMessage,
          status: 'Error',
          hidden: testCase.hidden,
        });
      }
    }

    // Separate visible and hidden test results
    const visibleResults = testResults.filter(r => !r.hidden);
    const hiddenResults = testResults.filter(r => r.hidden);

    // Calculate test statistics
    const passedCount = testResults.filter(r => r.passed).length;
    const totalCount = testResults.length;
    const allPassed = passedCount === totalCount;

    // Hidden test stats (only counts, no per-case details)
    const hiddenPassed = hiddenResults.filter(r => r.passed).length;
    const hiddenTotal = hiddenResults.length;

    // Get AI evaluation of code quality (correctness already proven by tests)
    const evaluation = await evaluateCodeQuality(
      code,
      language,
      challenge.title,
      challenge.description,
      passedCount,
      totalCount,
      hintsUsed,
      timeSpent,
      challenge.time_limit_seconds
    );

    // Override correctness based on actual test results
    evaluation.correctness = Math.round((passedCount / totalCount) * 100);

    // Save final submission
    const { data: submission, error: submissionError } = await supabase
      .from('code_submissions')
      .insert({
        session_id: sessionId,
        challenge_id: challengeId,
        language,
        code,
        status: allPassed ? 'passed' : 'failed',
        test_results: testResults as unknown as Json,
        hints_used: hintsUsed,
        execution_time_ms: totalTimeMs,
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
        content: `[Code Submission]\nLanguage: ${language}\nHints Used: ${hintsUsed}\nTime Spent: ${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s\nTests: ${passedCount}/${totalCount} passed\n\n\`\`\`${language}\n${code}\n\`\`\``,
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

    // Only return visible test results with full details
    // Hidden tests only show aggregate pass/fail count (no per-case info to prevent probing)
    const sanitizedVisibleResults = visibleResults.map(r => ({
      passed: r.passed,
      input: r.input,
      expected: r.expected,
      actual: r.actual,
      timeMs: r.timeMs,
      memoryKb: r.memoryKb,
      error: r.error,
      status: r.status,
    }));

    return NextResponse.json({
      success: true,
      submissionId: submission?.id,
      evaluation,
      // Only visible test cases get full results
      testResults: sanitizedVisibleResults,
      // Summary includes all tests
      summary: {
        passed: passedCount,
        total: totalCount,
        allPassed,
        executionTimeMs: totalTimeMs,
      },
      // Hidden tests only show counts (prevents probing individual cases)
      hiddenTests: {
        passed: hiddenPassed,
        total: hiddenTotal,
        allPassed: hiddenPassed === hiddenTotal,
      },
    });
  } catch (error) {
    console.error('Error submitting code:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit', message: 'Too many requests. Please wait and try again.' },
          { status: 429 }
        );
      }
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Configuration error', message: 'Code execution service is misconfigured' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Server error', message: 'Failed to submit code' },
      { status: 500 }
    );
  }
}

/**
 * Execute a single test case via Judge0
 */
async function executeTestCase(
  userCode: string,
  language: ProgrammingLanguage,
  functionName: string,
  testCase: TestCase
): Promise<TestResult> {
  // Parse the input as JSON array of arguments
  let inputArgs: unknown[];
  try {
    const parsed: unknown = JSON.parse(testCase.input);
    if (Array.isArray(parsed)) {
      inputArgs = parsed;
    } else {
      inputArgs = [parsed];
    }
  } catch {
    inputArgs = [testCase.input];
  }

  // Generate wrapped code with test harness for ALL languages
  const inputJson = JSON.stringify(inputArgs);
  let wrappedCode: string;
  if (hasNativeJsonSupport(language)) {
    wrappedCode = generateSimpleWrapper(userCode, language, functionName, inputArgs);
  } else {
    // Use the full test harness for compiled languages (Java, Go, Rust, C++)
    wrappedCode = generateTestHarness(userCode, language, functionName, inputJson);
  }

  // Create submission with stdin
  const submission = createSubmission(
    wrappedCode,
    language,
    JSON.stringify(inputArgs)
  );

  // Submit and wait for result
  const result = await submitCode(submission, true);

  // Parse the result
  const statusId = result.status.id;
  const stdout = result.stdout?.trim() ?? '';
  const stderr = result.stderr?.trim() ?? '';
  const compileOutput = result.compile_output?.trim() ?? '';
  const executionTime = result.time ? parseFloat(result.time) * 1000 : 0;
  const memoryUsed = result.memory ?? 0;

  // Determine if test passed
  let actual = stdout;
  let error: string | undefined;
  let passed = false;

  if (statusId === JUDGE0_STATUS.ACCEPTED) {
    const normalizedActual = normalizeOutput(actual);
    const normalizedExpected = normalizeOutput(testCase.expected);
    passed = normalizedActual === normalizedExpected;
  } else if (statusId === JUDGE0_STATUS.COMPILATION_ERROR) {
    error = compileOutput || 'Compilation error';
    actual = '';
  } else if (statusId === JUDGE0_STATUS.TIME_LIMIT_EXCEEDED) {
    error = 'Time limit exceeded (>5s)';
    actual = '';
  } else if (isRuntimeError(statusId)) {
    error = stderr ?? compileOutput ?? 'Runtime error';
    actual = '';
  } else {
    error = result.message ?? stderr ?? 'Execution failed';
    actual = stdout;
  }

  // Return result with hidden flag for filtering later
  return {
    passed,
    input: testCase.input,
    expected: testCase.expected,
    actual,
    timeMs: Math.round(executionTime),
    memoryKb: memoryUsed,
    error,
    status: getStatusMessage(statusId),
    hidden: testCase.hidden, // Track which tests are hidden
  };
}

/**
 * Normalize output for comparison
 */
function normalizeOutput(output: string): string {
  const trimmed = output.trim();

  try {
    const parsed: unknown = JSON.parse(trimmed);
    return JSON.stringify(parsed);
  } catch {
    return trimmed.replace(/\s+/g, ' ');
  }
}

/**
 * Evaluate code quality using AI
 * Correctness is already determined by test results
 */
async function evaluateCodeQuality(
  code: string,
  language: string,
  challengeTitle: string,
  challengeDescription: string,
  passedTests: number,
  totalTests: number,
  hintsUsed: number,
  timeSpent: number,
  timeLimit: number
): Promise<CodeEvaluation> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a senior software engineer reviewing code that has already been tested.

IMPORTANT: The code has been executed against ${totalTests} test cases, and ${passedTests} passed.
DO NOT evaluate correctness - that's already determined by the test results.

Focus your evaluation ONLY on:
- Code quality and readability
- Algorithm efficiency and time/space complexity
- Best practices and style
- Problem-solving approach

You MUST respond with ONLY a valid JSON object matching this exact structure:
{
  "correctness": ${Math.round((passedTests / totalTests) * 100)},
  "efficiency": 0-100,
  "codeQuality": 0-100,
  "problemSolving": 0-100,
  "feedback": "detailed feedback string focusing on code quality, not correctness",
  "suggestions": ["suggestion 1", "suggestion 2"],
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)"
}

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

## Execution Results:
- Tests Passed: ${passedTests}/${totalTests}
- Hints Used: ${hintsUsed}
- Time Spent: ${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s
- Time Limit: ${Math.floor(timeLimit / 60)}m

Evaluate this solution's code quality and provide your assessment as JSON.
Remember: correctness is already proven by test results - focus on quality, efficiency, and best practices.`,
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

    // Apply hint penalty to problem solving score
    if (hintsUsed > 0) {
      validated.problemSolving = Math.max(0, validated.problemSolving - hintsUsed * 10);
    }

    // Ensure correctness reflects actual test results
    validated.correctness = Math.round((passedTests / totalTests) * 100);

    return validated;
  } catch (error) {
    console.error('Evaluation error:', error);
    // Return default evaluation on error
    return {
      correctness: Math.round((passedTests / totalTests) * 100),
      efficiency: 50,
      codeQuality: 50,
      problemSolving: Math.max(0, 50 - hintsUsed * 10),
      feedback: `Your solution passed ${passedTests}/${totalTests} tests. Unable to provide detailed code quality feedback.`,
      suggestions: ['Consider edge cases', 'Add comments to explain your approach'],
      timeComplexity: 'Unknown',
      spaceComplexity: 'Unknown',
    };
  }
}
