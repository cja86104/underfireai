/**
 * UnderFireAI - Judge0 Code Execution Client
 *
 * Production-ready code execution using Judge0 sandboxed containers.
 * Uses RapidAPI hosted Judge0 CE for zero setup and pay-per-use pricing.
 *
 * Features:
 * - Real code execution in isolated Docker containers
 * - No network access, time/memory limits enforced
 * - Batch submission support for efficiency
 * - 7 language support: JavaScript, TypeScript, Python, Java, Go, Rust, C++
 */

import type { ProgrammingLanguage } from '@/types/coding';

// ===========================================
// CONFIGURATION
// ===========================================

const JUDGE0_BASE_URL = 'https://judge0-ce.p.rapidapi.com';

/**
 * Judge0 language IDs for supported languages
 * See: https://ce.judge0.com/languages
 */
export const JUDGE0_LANGUAGE_IDS: Record<ProgrammingLanguage, number> = {
  javascript: 63,  // Node.js 12.14.0
  typescript: 74,  // TypeScript 3.7.4
  python: 71,      // Python 3.8.1
  java: 62,        // Java OpenJDK 13.0.1
  go: 60,          // Go 1.13.5
  rust: 73,        // Rust 1.40.0
  cpp: 54,         // C++ GCC 9.2.0
};

/**
 * Judge0 submission status codes
 */
export const JUDGE0_STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
} as const;

/**
 * Map status ID to user-friendly message
 */
export function getStatusMessage(statusId: number): string {
  switch (statusId) {
    case JUDGE0_STATUS.IN_QUEUE:
      return 'In Queue';
    case JUDGE0_STATUS.PROCESSING:
      return 'Processing';
    case JUDGE0_STATUS.ACCEPTED:
      return 'Accepted';
    case JUDGE0_STATUS.WRONG_ANSWER:
      return 'Wrong Answer';
    case JUDGE0_STATUS.TIME_LIMIT_EXCEEDED:
      return 'Time Limit Exceeded';
    case JUDGE0_STATUS.COMPILATION_ERROR:
      return 'Compilation Error';
    case JUDGE0_STATUS.RUNTIME_ERROR_SIGSEGV:
    case JUDGE0_STATUS.RUNTIME_ERROR_SIGXFSZ:
    case JUDGE0_STATUS.RUNTIME_ERROR_SIGFPE:
    case JUDGE0_STATUS.RUNTIME_ERROR_SIGABRT:
    case JUDGE0_STATUS.RUNTIME_ERROR_NZEC:
    case JUDGE0_STATUS.RUNTIME_ERROR_OTHER:
      return 'Runtime Error';
    case JUDGE0_STATUS.INTERNAL_ERROR:
      return 'Internal Error';
    case JUDGE0_STATUS.EXEC_FORMAT_ERROR:
      return 'Execution Format Error';
    default:
      return 'Unknown Status';
  }
}

/**
 * Check if status indicates completion (success or failure)
 */
export function isCompleted(statusId: number): boolean {
  return statusId >= JUDGE0_STATUS.ACCEPTED;
}

/**
 * Check if status indicates successful execution
 */
export function isSuccess(statusId: number): boolean {
  return statusId === JUDGE0_STATUS.ACCEPTED;
}

/**
 * Check if status indicates a runtime error
 */
export function isRuntimeError(statusId: number): boolean {
  return statusId >= JUDGE0_STATUS.RUNTIME_ERROR_SIGSEGV &&
         statusId <= JUDGE0_STATUS.RUNTIME_ERROR_OTHER;
}

// ===========================================
// TYPES
// ===========================================

export interface Judge0Submission {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
}

export interface Judge0SubmissionResponse {
  token: string;
}

export interface Judge0Result {
  token: string;
  status: {
    id: number;
    description: string;
  };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
  message: string | null;
}

export interface Judge0BatchSubmissionResponse {
  submissions: Judge0SubmissionResponse[];
}

export interface Judge0BatchResultResponse {
  submissions: Judge0Result[];
}

// ===========================================
// API CLIENT
// ===========================================

/**
 * Check if Judge0 is configured
 */
export function isJudge0Configured(): boolean {
  return !!process.env.JUDGE0_API_KEY;
}

/**
 * Get Judge0 API headers
 */
function getHeaders(): HeadersInit {
  const apiKey = process.env.JUDGE0_API_KEY;
  const apiHost = process.env.JUDGE0_API_HOST ?? 'judge0-ce.p.rapidapi.com';

  if (!apiKey) {
    throw new Error('JUDGE0_API_KEY environment variable is not set');
  }

  return {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': apiHost,
  };
}

/**
 * Submit a single code submission to Judge0
 */
export async function submitCode(
  submission: Judge0Submission,
  wait = true
): Promise<Judge0Result> {
  const url = new URL(`${JUDGE0_BASE_URL}/submissions`);
  url.searchParams.set('base64_encoded', 'false');
  url.searchParams.set('wait', wait.toString());
  url.searchParams.set('fields', '*');

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json() as Promise<Judge0Result>;
}

/**
 * Submit multiple code submissions as a batch
 */
export async function submitBatch(
  submissions: Judge0Submission[]
): Promise<Judge0SubmissionResponse[]> {
  if (submissions.length === 0) {
    return [];
  }

  if (submissions.length > 20) {
    throw new Error('Batch size cannot exceed 20 submissions');
  }

  const url = new URL(`${JUDGE0_BASE_URL}/submissions/batch`);
  url.searchParams.set('base64_encoded', 'false');

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ submissions }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data = await response.json() as Judge0BatchSubmissionResponse;
  return data.submissions ?? [];
}

/**
 * Get the result of a single submission by token
 */
export async function getSubmissionResult(token: string): Promise<Judge0Result> {
  const url = new URL(`${JUDGE0_BASE_URL}/submissions/${token}`);
  url.searchParams.set('base64_encoded', 'false');
  url.searchParams.set('fields', '*');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json() as Promise<Judge0Result>;
}

/**
 * Get results for multiple submissions by tokens
 */
export async function getBatchResults(tokens: string[]): Promise<Judge0Result[]> {
  if (tokens.length === 0) {
    return [];
  }

  const url = new URL(`${JUDGE0_BASE_URL}/submissions/batch`);
  url.searchParams.set('tokens', tokens.join(','));
  url.searchParams.set('base64_encoded', 'false');
  url.searchParams.set('fields', '*');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data = await response.json() as Judge0BatchResultResponse;
  return data.submissions ?? [];
}

/**
 * Poll for batch results until all are completed
 */
export async function pollBatchResults(
  tokens: string[],
  maxAttempts = 30,
  intervalMs = 500
): Promise<Judge0Result[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const results = await getBatchResults(tokens);

    // Check if all submissions are completed
    const allCompleted = results.every(r => isCompleted(r.status.id));
    if (allCompleted) {
      return results;
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  // Return whatever we have after max attempts
  return getBatchResults(tokens);
}

/**
 * Map programming language to Judge0 language ID
 */
export function mapLanguageToId(language: ProgrammingLanguage): number {
  const id = JUDGE0_LANGUAGE_IDS[language];
  if (id === undefined) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return id;
}

/**
 * Handle API errors with user-friendly messages
 */
async function handleApiError(response: Response): Promise<never> {
  let errorMessage = `Judge0 API error: ${response.status}`;

  try {
    const errorData = await response.json() as { error?: string; message?: string };
    errorMessage = errorData.error ?? errorData.message ?? errorMessage;
  } catch {
    // Use status text if JSON parsing fails
    errorMessage = `${errorMessage} - ${response.statusText}`;
  }

  if (response.status === 401) {
    throw new Error('Judge0 API key is invalid or missing');
  }

  if (response.status === 429) {
    throw new Error('Rate limit exceeded. Please wait and try again.');
  }

  if (response.status === 422) {
    throw new Error(`Invalid submission: ${errorMessage}`);
  }

  throw new Error(errorMessage);
}

// ===========================================
// EXECUTION LIMITS
// ===========================================

/**
 * Default execution limits for code submissions
 */
export const DEFAULT_LIMITS = {
  /** Time limit per test case in seconds */
  cpuTimeLimit: 5,
  /** Memory limit in kilobytes (128MB) */
  memoryLimit: 128000,
  /** Maximum output size in kilobytes (64KB) */
  maxOutputSize: 64,
};

/**
 * Create a submission object with default limits
 */
export function createSubmission(
  sourceCode: string,
  language: ProgrammingLanguage,
  stdin?: string,
  expectedOutput?: string
): Judge0Submission {
  return {
    source_code: sourceCode,
    language_id: mapLanguageToId(language),
    stdin,
    expected_output: expectedOutput,
    cpu_time_limit: DEFAULT_LIMITS.cpuTimeLimit,
    memory_limit: DEFAULT_LIMITS.memoryLimit,
  };
}
