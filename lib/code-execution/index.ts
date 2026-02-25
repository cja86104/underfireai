/**
 * UnderFireAI - Code Execution Module
 *
 * Provides real code execution via Judge0 sandboxed containers.
 * Replaces AI-simulated code evaluation with actual execution.
 */

// Judge0 API client
export {
  // Configuration
  JUDGE0_LANGUAGE_IDS,
  JUDGE0_STATUS,
  DEFAULT_LIMITS,
  RETRY_CONFIG,
  POLLING_CONFIG,
  isJudge0Configured,

  // Status helpers
  getStatusMessage,
  isCompleted,
  isSuccess,
  isRuntimeError,

  // API functions
  submitCode,
  submitAndPoll,
  submitBatch,
  getSubmissionResult,
  getBatchResults,
  pollBatchResults,

  // Utilities
  mapLanguageToId,
  createSubmission,

  // Types & Errors
  Judge0Error,
  type Judge0Submission,
  type Judge0SubmissionResponse,
  type Judge0Result,
  type Judge0BatchSubmissionResponse,
  type Judge0BatchResultResponse,
} from './judge0';

// Language wrappers
export {
  generateTestHarness,
  generateSimpleWrapper,
  generateDirectInputWrapper,
  extractFunctionName,
  extractAnyFunctionName,
  getDefaultFunctionName,
  hasNativeJsonSupport,
} from './language-wrappers';
