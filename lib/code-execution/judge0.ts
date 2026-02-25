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
 * - Exponential backoff with jitter for rate limiting
 * - Graceful degradation for slow responses
 */

import type { ProgrammingLanguage } from '@/types/coding';

// ===========================================
// CONFIGURATION
// ===========================================

const JUDGE0_BASE_URL = 'https://judge0-ce.p.rapidapi.com';

/**
 * Retry configuration for API resilience
 */
export const RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  maxRetries: 3,
  /** Base delay in milliseconds (doubles with each retry) */
  baseDelayMs: 1000,
  /** Maximum delay cap in milliseconds */
  maxDelayMs: 10000,
  /** Jitter factor (0-1) to randomize delays */
  jitterFactor: 0.3,
  /** HTTP status codes that should trigger a retry */
  retryableStatuses: [429, 500, 502, 503, 504],
};

/**
 * Polling configuration for async submissions
 */
export const POLLING_CONFIG = {
  /** Initial polling interval in milliseconds */
  initialIntervalMs: 500,
  /** Maximum polling interval in milliseconds */
  maxIntervalMs: 3000,
  /** Interval multiplier for backoff */
  backoffMultiplier: 1.5,
  /** Maximum total polling time in milliseconds (60 seconds) */
  maxTotalTimeMs: 60000,
};

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
// RETRY & RESILIENCE UTILITIES
// ===========================================

/**
 * Custom error class for Judge0 API errors with retry information
 */
export class Judge0Error extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly isRetryable: boolean,
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = 'Judge0Error';
  }
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay(attempt: number, config = RETRY_CONFIG): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFactor * Math.random();

  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Judge0Error) {
    return error.isRetryable;
  }
  // Network errors are typically retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  return false;
}

/**
 * Execute a function with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? RETRY_CONFIG.maxRetries;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt or error is not retryable
      if (attempt >= maxRetries || !isRetryableError(error)) {
        throw error;
      }

      // Calculate delay (check for Retry-After header if available)
      let delayMs: number;
      if (error instanceof Judge0Error && error.retryAfterMs) {
        delayMs = error.retryAfterMs;
      } else {
        delayMs = calculateBackoffDelay(attempt);
      }

      // Notify caller about retry
      options.onRetry?.(attempt + 1, error, delayMs);

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  throw lastError;
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
 * Parse Retry-After header value to milliseconds
 */
function parseRetryAfter(response: Response): number | undefined {
  const retryAfter = response.headers.get('Retry-After');
  if (!retryAfter) return undefined;

  // Try parsing as seconds
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return undefined;
}

/**
 * Handle API errors with detailed information
 */
async function handleApiError(response: Response): Promise<never> {
  let errorMessage = `Judge0 API error: ${response.status}`;
  const isRetryable = RETRY_CONFIG.retryableStatuses.includes(response.status);
  const retryAfterMs = parseRetryAfter(response);

  try {
    const errorData = await response.json() as { error?: string; message?: string };
    errorMessage = errorData.error ?? errorData.message ?? errorMessage;
  } catch {
    errorMessage = `${errorMessage} - ${response.statusText}`;
  }

  if (response.status === 401) {
    throw new Judge0Error('Judge0 API key is invalid or missing', 401, false);
  }

  if (response.status === 429) {
    throw new Judge0Error(
      'Rate limit exceeded. Retrying...',
      429,
      true,
      retryAfterMs ?? RETRY_CONFIG.baseDelayMs * 2
    );
  }

  if (response.status === 422) {
    throw new Judge0Error(`Invalid submission: ${errorMessage}`, 422, false);
  }

  throw new Judge0Error(errorMessage, response.status, isRetryable, retryAfterMs);
}

/**
 * Submit a single code submission to Judge0 with retry support
 */
export async function submitCode(
  submission: Judge0Submission,
  wait = true,
  options: {
    maxRetries?: number;
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
    onSlowExecution?: () => void;
  } = {}
): Promise<Judge0Result> {
  return withRetry(
    async () => {
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
    },
    {
      maxRetries: options.maxRetries,
      onRetry: options.onRetry,
    }
  );
}

/**
 * Submit a code and poll for result with resilient polling
 * Use this instead of submitCode with wait=true for better resilience
 */
export async function submitAndPoll(
  submission: Judge0Submission,
  options: {
    maxRetries?: number;
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
    onPolling?: (elapsedMs: number, status: string) => void;
  } = {}
): Promise<Judge0Result> {
  // Submit without waiting
  const submitResponse = await withRetry(
    async () => {
      const url = new URL(`${JUDGE0_BASE_URL}/submissions`);
      url.searchParams.set('base64_encoded', 'false');
      url.searchParams.set('wait', 'false');

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(submission),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      return response.json() as Promise<Judge0SubmissionResponse>;
    },
    { maxRetries: options.maxRetries, onRetry: options.onRetry }
  );

  // Poll for result with backoff
  return pollSingleResult(submitResponse.token, {
    onPolling: options.onPolling,
    onRetry: options.onRetry,
  });
}

/**
 * Poll for a single submission result with exponential backoff
 */
async function pollSingleResult(
  token: string,
  options: {
    onPolling?: (elapsedMs: number, status: string) => void;
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  } = {}
): Promise<Judge0Result> {
  const startTime = Date.now();
  let intervalMs = POLLING_CONFIG.initialIntervalMs;

  while (Date.now() - startTime < POLLING_CONFIG.maxTotalTimeMs) {
    const result = await withRetry(
      () => getSubmissionResult(token),
      { maxRetries: 2, onRetry: options.onRetry }
    );

    if (isCompleted(result.status.id)) {
      return result;
    }

    // Notify about polling progress
    options.onPolling?.(Date.now() - startTime, result.status.description);

    // Wait with backoff
    await sleep(intervalMs);
    intervalMs = Math.min(
      intervalMs * POLLING_CONFIG.backoffMultiplier,
      POLLING_CONFIG.maxIntervalMs
    );
  }

  // Timeout - return whatever we have
  const finalResult = await getSubmissionResult(token);
  if (!isCompleted(finalResult.status.id)) {
    throw new Judge0Error(
      'Code execution is taking longer than expected. Please try again.',
      408,
      true
    );
  }
  return finalResult;
}

/**
 * Submit multiple code submissions as a batch with retry support
 */
export async function submitBatch(
  submissions: Judge0Submission[],
  options: {
    maxRetries?: number;
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  } = {}
): Promise<Judge0SubmissionResponse[]> {
  if (submissions.length === 0) {
    return [];
  }

  if (submissions.length > 20) {
    throw new Error('Batch size cannot exceed 20 submissions');
  }

  return withRetry(
    async () => {
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
    },
    { maxRetries: options.maxRetries, onRetry: options.onRetry }
  );
}

/**
 * Get the result of a single submission by token with retry support
 */
export async function getSubmissionResult(
  token: string,
  options: {
    maxRetries?: number;
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  } = {}
): Promise<Judge0Result> {
  return withRetry(
    async () => {
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
    },
    { maxRetries: options.maxRetries, onRetry: options.onRetry }
  );
}

/**
 * Get results for multiple submissions by tokens with retry support
 */
export async function getBatchResults(
  tokens: string[],
  options: {
    maxRetries?: number;
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  } = {}
): Promise<Judge0Result[]> {
  if (tokens.length === 0) {
    return [];
  }

  return withRetry(
    async () => {
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
    },
    { maxRetries: options.maxRetries, onRetry: options.onRetry }
  );
}

/**
 * Poll for batch results until all are completed with exponential backoff
 */
export async function pollBatchResults(
  tokens: string[],
  options: {
    maxTotalTimeMs?: number;
    onPolling?: (elapsedMs: number, completedCount: number, totalCount: number) => void;
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  } = {}
): Promise<Judge0Result[]> {
  const maxTotalTimeMs = options.maxTotalTimeMs ?? POLLING_CONFIG.maxTotalTimeMs;
  const startTime = Date.now();
  let intervalMs = POLLING_CONFIG.initialIntervalMs;

  while (Date.now() - startTime < maxTotalTimeMs) {
    const results = await getBatchResults(tokens, { onRetry: options.onRetry });

    // Count completed submissions
    const completedCount = results.filter(r => isCompleted(r.status.id)).length;
    const allCompleted = completedCount === tokens.length;

    // Notify about progress
    options.onPolling?.(Date.now() - startTime, completedCount, tokens.length);

    if (allCompleted) {
      return results;
    }

    // Wait with backoff
    await sleep(intervalMs);
    intervalMs = Math.min(
      intervalMs * POLLING_CONFIG.backoffMultiplier,
      POLLING_CONFIG.maxIntervalMs
    );
  }

  // Return whatever we have after timeout
  const finalResults = await getBatchResults(tokens);
  const incompleteCount = finalResults.filter(r => !isCompleted(r.status.id)).length;

  if (incompleteCount > 0) {
    console.warn(`Polling timeout: ${incompleteCount}/${tokens.length} submissions still pending`);
  }

  return finalResults;
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
