import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
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
  extractFunctionName,
  hasNativeJsonSupport,
} from '@/lib/code-execution/language-wrappers';
import type { TestResult, ProgrammingLanguage } from '@/types/coding';
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

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Invalid state', message: 'Session is not active' },
        { status: 400 }
      );
    }

    const body = await request.json() as RunCodeRequest;
    const { code, language, challengeId } = body;

    // Validate language
    const validLanguages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'cpp'];
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language', message: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }

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

    const allTestCases = challenge.test_cases as unknown as TestCase[];
    // Only run visible test cases for "Run" button
    const visibleTestCases = allTestCases.filter((tc) => !tc.hidden).slice(0, 3);

    // Extract function name from starter code
    const starterCode = challenge.starter_code as Record<string, string> | null;
    const languageStarterCode = starterCode?.[language] ?? code;
    const functionName = extractFunctionName(languageStarterCode, language as ProgrammingLanguage);

    if (!functionName) {
      return NextResponse.json(
        { error: 'Parse error', message: 'Could not detect function name in code' },
        { status: 400 }
      );
    }

    // Execute each test case via Judge0
    const testResults: TestResult[] = [];
    let totalTimeMs = 0;

    for (const testCase of visibleTestCases) {
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
        // Handle execution errors
        const errorMessage = error instanceof Error ? error.message : 'Execution failed';
        testResults.push({
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          actual: '',
          error: errorMessage,
          status: 'Error',
        });
      }
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
        execution_time_ms: totalTimeMs,
      });

    return NextResponse.json({
      status: testResults.every((r) => r.passed) ? 'passed' : 'failed',
      testResults,
      executionTimeMs: totalTimeMs,
    });
  } catch (error) {
    console.error('Error running code:', error);

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
      { error: 'Server error', message: 'Failed to run code' },
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
    // If input is not valid JSON, treat it as a single string argument
    inputArgs = [testCase.input];
  }

  // Generate wrapped code with test harness
  let wrappedCode: string;
  if (hasNativeJsonSupport(language)) {
    wrappedCode = generateSimpleWrapper(userCode, language, functionName, inputArgs);
  } else {
    // For compiled languages, we need the user to provide a complete solution
    // that handles input/output directly
    wrappedCode = userCode;
  }

  // Create submission with stdin (the input JSON)
  const submission = createSubmission(
    wrappedCode,
    language,
    JSON.stringify(inputArgs)
  );

  // Submit and wait for result (synchronous execution)
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
    // Normalize outputs for comparison
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

  return {
    passed,
    input: testCase.input,
    expected: testCase.expected,
    actual,
    timeMs: Math.round(executionTime),
    memoryKb: memoryUsed,
    error,
    status: getStatusMessage(statusId),
  };
}

/**
 * Normalize output for comparison
 * Handles JSON formatting differences, whitespace, etc.
 */
function normalizeOutput(output: string): string {
  const trimmed = output.trim();

  // Try to parse as JSON and re-stringify for consistent formatting
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return JSON.stringify(parsed);
  } catch {
    // If not valid JSON, just normalize whitespace
    return trimmed.replace(/\s+/g, ' ');
  }
}
