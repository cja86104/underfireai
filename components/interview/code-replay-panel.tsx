'use client';

import { useState, useMemo } from 'react';
import {
  Code2,
  CheckCircle2,
  XCircle,
  Clock,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { LANGUAGE_DISPLAY_NAMES, type ProgrammingLanguage } from '@/types/coding';

// ===========================================
// TYPES
// ===========================================

export interface CodeSubmissionReplay {
  id: string;
  language: string;
  code: string;
  status: string;
  testResults: TestResultReplay[];
  hintsUsed: number;
  executionTimeMs: number | null;
  submittedAt: string;
  evaluation?: CodeEvaluationReplay;
}

interface TestResultReplay {
  passed: boolean;
  input?: string;
  expected?: string;
  actual?: string;
  error?: string;
  status?: string;
}

interface CodeEvaluationReplay {
  correctness: number;
  efficiency: number;
  codeQuality: number;
  problemSolving: number;
  feedback?: string;
  suggestions?: string[];
  timeComplexity?: string;
  spaceComplexity?: string;
}

export interface CodingChallengeReplay {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  category: string;
  timeLimitSeconds: number;
}

interface CodeReplayPanelProps {
  challenge: CodingChallengeReplay | null;
  submissions: CodeSubmissionReplay[];
  currentSubmissionIndex: number;
  onSubmissionSelect: (index: number) => void;
}

// ===========================================
// COMPONENT
// ===========================================

export function CodeReplayPanel({
  challenge,
  submissions,
  currentSubmissionIndex,
  onSubmissionSelect,
}: CodeReplayPanelProps): React.JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTestResults, setShowTestResults] = useState(false);

  const currentSubmission = submissions[currentSubmissionIndex];

  // Calculate stats
  const stats = useMemo(() => {
    if (!currentSubmission) return null;

    const passedTests = currentSubmission.testResults.filter(r => r.passed).length;
    const totalTests = currentSubmission.testResults.length;

    return {
      passedTests,
      totalTests,
      allPassed: passedTests === totalTests,
      executionTime: currentSubmission.executionTimeMs,
      hintsUsed: currentSubmission.hintsUsed,
    };
  }, [currentSubmission]);

  if (!challenge || submissions.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-800 bg-slate-900/80">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Code2 className="h-5 w-5 text-blue-400" />
          <span className="font-medium text-white">Coding Challenge</span>
          <span className="text-sm text-slate-400">{challenge.title}</span>
          {stats && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              stats.allPassed
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            )}>
              {stats.passedTests}/{stats.totalTests} tests
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && currentSubmission && (
        <div className="px-6 pb-4">
          {/* Submission Selector */}
          {submissions.length > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-slate-400">Submission:</span>
              <div className="flex gap-1">
                {submissions.map((sub, index) => (
                  <button
                    key={sub.id}
                    onClick={() => onSubmissionSelect(index)}
                    className={cn(
                      'px-3 py-1 rounded text-sm transition-colors',
                      index === currentSubmissionIndex
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    )}
                  >
                    #{index + 1}
                    {sub.status === 'passed' && (
                      <CheckCircle2 className="h-3 w-3 ml-1 inline text-green-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center gap-6 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-slate-500" />
              <span className="text-slate-400">
                {LANGUAGE_DISPLAY_NAMES[currentSubmission.language as ProgrammingLanguage] || currentSubmission.language}
              </span>
            </div>
            {stats && (
              <>
                <div className="flex items-center gap-2">
                  {stats.allPassed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={stats.allPassed ? 'text-green-400' : 'text-red-400'}>
                    {stats.passedTests}/{stats.totalTests} passed
                  </span>
                </div>
                {stats.executionTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-400">{stats.executionTime}ms</span>
                  </div>
                )}
                {stats.hintsUsed > 0 && (
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-400">{stats.hintsUsed} hints used</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Code Display */}
          <div className="rounded-lg overflow-hidden border border-slate-700">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
              <span className="text-sm text-slate-400">
                Submitted at {new Date(currentSubmission.submittedAt).toLocaleTimeString()}
              </span>
              <button
                onClick={() => setShowTestResults(!showTestResults)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {showTestResults ? 'Hide' : 'Show'} test results
              </button>
            </div>
            <pre className="p-4 bg-slate-950 overflow-x-auto text-sm">
              <code className="text-slate-300 font-mono whitespace-pre">
                {currentSubmission.code}
              </code>
            </pre>
          </div>

          {/* Test Results */}
          {showTestResults && currentSubmission.testResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Test Results</h4>
              {currentSubmission.testResults.map((result, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-3 rounded-lg border',
                    result.passed
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <span className={cn(
                      'text-sm font-medium',
                      result.passed ? 'text-green-400' : 'text-red-400'
                    )}>
                      Test {index + 1}: {result.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                  {result.input && (
                    <div className="text-xs text-slate-400 font-mono">
                      <span className="text-slate-500">Input:</span> {result.input}
                    </div>
                  )}
                  {result.expected && (
                    <div className="text-xs text-slate-400 font-mono">
                      <span className="text-slate-500">Expected:</span> {result.expected}
                    </div>
                  )}
                  {result.actual && (
                    <div className="text-xs text-slate-400 font-mono">
                      <span className="text-slate-500">Actual:</span> {result.actual}
                    </div>
                  )}
                  {result.error && (
                    <div className="text-xs text-red-400 font-mono mt-1">
                      {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Evaluation */}
          {currentSubmission.evaluation && (
            <div className="mt-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Code Evaluation</h4>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <EvaluationScore label="Correctness" value={currentSubmission.evaluation.correctness} />
                <EvaluationScore label="Efficiency" value={currentSubmission.evaluation.efficiency} />
                <EvaluationScore label="Code Quality" value={currentSubmission.evaluation.codeQuality} />
                <EvaluationScore label="Problem Solving" value={currentSubmission.evaluation.problemSolving} />
              </div>
              {currentSubmission.evaluation.timeComplexity && (
                <div className="text-xs text-slate-400 mb-2">
                  <span className="text-slate-500">Time Complexity:</span>{' '}
                  <span className="font-mono">{currentSubmission.evaluation.timeComplexity}</span>
                  {currentSubmission.evaluation.spaceComplexity && (
                    <>
                      {' | '}
                      <span className="text-slate-500">Space:</span>{' '}
                      <span className="font-mono">{currentSubmission.evaluation.spaceComplexity}</span>
                    </>
                  )}
                </div>
              )}
              {currentSubmission.evaluation.feedback && (
                <p className="text-sm text-slate-300 mt-2">
                  {currentSubmission.evaluation.feedback}
                </p>
              )}
              {currentSubmission.evaluation.suggestions && currentSubmission.evaluation.suggestions.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-slate-500">Suggestions:</span>
                  <ul className="mt-1 space-y-1">
                    {currentSubmission.evaluation.suggestions.map((suggestion, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================
// HELPER COMPONENTS
// ===========================================

interface EvaluationScoreProps {
  label: string;
  value: number;
}

function EvaluationScore({ label, value }: EvaluationScoreProps): React.JSX.Element {
  const getColor = (v: number): string => {
    if (v >= 80) return 'text-green-400';
    if (v >= 60) return 'text-yellow-400';
    if (v >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="text-center">
      <div className={cn('text-lg font-bold', getColor(value))}>{value}%</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
