/**
 * UnderFireAI Coding Interview Types
 * Types for live coding challenges during technical interviews
 */

import { z } from 'zod';

// ===========================================
// SUPPORTED LANGUAGES
// ===========================================
export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'cpp',
] as const;

export type ProgrammingLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_DISPLAY_NAMES: Record<ProgrammingLanguage, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  go: 'Go',
  rust: 'Rust',
  cpp: 'C++',
};

export const LANGUAGE_FILE_EXTENSIONS: Record<ProgrammingLanguage, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  go: 'go',
  rust: 'rs',
  cpp: 'cpp',
};

// ===========================================
// CODING CHALLENGE
// ===========================================
export interface TestCase {
  input: string;
  expected: string;
  hidden: boolean;
}

export interface CodingChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  category: string;
  languages: ProgrammingLanguage[];
  starterCode: Record<ProgrammingLanguage, string>;
  testCases: TestCase[];
  hints: string[];
  timeLimitSeconds: number;
  createdAt: string;
  updatedAt: string;
}

// ===========================================
// CODE SUBMISSION
// ===========================================
export type SubmissionStatus = 'submitted' | 'running' | 'passed' | 'failed' | 'error';

export interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  timeMs?: number;
  error?: string;
}

export interface CodeSubmission {
  id: string;
  sessionId: string;
  challengeId: string | null;
  language: ProgrammingLanguage;
  code: string;
  status: SubmissionStatus;
  testResults: TestResult[];
  executionTimeMs: number | null;
  hintsUsed: number;
  submittedAt: string;
}

// ===========================================
// CODING SESSION STATE
// ===========================================
export interface CodingSessionState {
  challengeId: string;
  language: ProgrammingLanguage;
  code: string;
  hintsRevealed: number;
  startedAt: string;
  submissions: CodeSubmission[];
  timeRemaining: number;
}

// ===========================================
// ZOD SCHEMAS
// ===========================================
export const testCaseSchema = z.object({
  input: z.string(),
  expected: z.string(),
  hidden: z.boolean(),
});

export const testResultSchema = z.object({
  passed: z.boolean(),
  input: z.string(),
  expected: z.string(),
  actual: z.string(),
  timeMs: z.number().optional(),
  error: z.string().optional(),
});

export const codeEvaluationSchema = z.object({
  correctness: z.number().min(0).max(100),
  efficiency: z.number().min(0).max(100),
  codeQuality: z.number().min(0).max(100),
  problemSolving: z.number().min(0).max(100),
  feedback: z.string(),
  suggestions: z.array(z.string()),
  timeComplexity: z.string().optional(),
  spaceComplexity: z.string().optional(),
});

export type CodeEvaluation = z.infer<typeof codeEvaluationSchema>;

// ===========================================
// API TYPES
// ===========================================
export interface RunCodeRequest {
  code: string;
  language: ProgrammingLanguage;
  challengeId: string;
}

export interface RunCodeResponse {
  status: SubmissionStatus;
  testResults: TestResult[];
  executionTimeMs: number;
  output?: string;
  error?: string;
}

export interface GetHintRequest {
  challengeId: string;
  hintIndex: number;
}

export interface GetHintResponse {
  hint: string;
  hintsRemaining: number;
  totalHints: number;
}

// ===========================================
// CHALLENGE CATEGORIES
// ===========================================
export const CHALLENGE_CATEGORIES = [
  'arrays',
  'strings',
  'linked_lists',
  'trees',
  'graphs',
  'dynamic_programming',
  'sorting',
  'searching',
  'stacks',
  'queues',
  'hash_tables',
  'recursion',
  'math',
  'bit_manipulation',
] as const;

export type ChallengeCategory = typeof CHALLENGE_CATEGORIES[number];

export const CATEGORY_DISPLAY_NAMES: Record<ChallengeCategory, string> = {
  arrays: 'Arrays',
  strings: 'Strings',
  linked_lists: 'Linked Lists',
  trees: 'Trees',
  graphs: 'Graphs',
  dynamic_programming: 'Dynamic Programming',
  sorting: 'Sorting',
  searching: 'Searching',
  stacks: 'Stacks',
  queues: 'Queues',
  hash_tables: 'Hash Tables',
  recursion: 'Recursion',
  math: 'Math',
  bit_manipulation: 'Bit Manipulation',
};
