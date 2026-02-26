'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Send,
  Lightbulb,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { CodeEditor } from './code-editor';
import type {
  CodingChallenge,
  ProgrammingLanguage,
  TestResult,
  CodeEvaluation,
} from '@/types/coding';

interface RunCodeApiResponse {
  status: string;
  testResults: TestResult[];
  executionTimeMs: number;
}

interface SubmitCodeApiResponse {
  success: boolean;
  submissionId?: string;
  evaluation?: CodeEvaluation;
}

interface CodingChallengeProps {
  sessionId: string;
  challenge: CodingChallenge;
  initialLanguage?: ProgrammingLanguage;
  onSubmit?: (code: string, language: ProgrammingLanguage) => void;
  onComplete?: (evaluation: CodeEvaluation) => void;
  disabled?: boolean;
}

export function CodingChallengeUI({
  sessionId,
  challenge,
  initialLanguage,
  onSubmit,
  onComplete,
  disabled = false,
}: CodingChallengeProps): React.JSX.Element {
  const defaultLanguage = initialLanguage ?? challenge.languages[0];
  const [language, setLanguage] = useState<ProgrammingLanguage>(defaultLanguage);
  const [code, setCode] = useState(
    challenge.starterCode[defaultLanguage] ?? ''
  );
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [showDescription, setShowDescription] = useState(true);
  const [showTestResults, setShowTestResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(challenge.timeLimitSeconds);
  const [timerStarted, setTimerStarted] = useState(false);

  // Handle language change - update code to starter code for new language
  const handleLanguageChange = useCallback((newLanguage: ProgrammingLanguage): void => {
    setLanguage(newLanguage);
    const starterCode = challenge.starterCode[newLanguage];
    if (starterCode) {
      setCode(starterCode);
    }
  }, [challenge.starterCode]);

  // Timer countdown
  useEffect(() => {
    if (!timerStarted || disabled || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          toast.warning('Time is up!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, disabled, timeRemaining]);

  // Start timer on first code change
  useEffect(() => {
    const starterCode = challenge.starterCode[language] ?? '';
    if (code !== starterCode && !timerStarted) {
      setTimerStarted(true);
    }
  }, [code, challenge.starterCode, language, timerStarted]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get time color based on remaining time
  const getTimeColor = (): string => {
    const percentage = timeRemaining / challenge.timeLimitSeconds;
    if (percentage > 0.5) return 'text-green-400';
    if (percentage > 0.25) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Run code against test cases
  const handleRunCode = async (): Promise<void> => {
    setIsRunning(true);
    setShowTestResults(true);

    try {
      const response = await fetch(`/api/interview/${sessionId}/code/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          challengeId: challenge.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string };
        const message = errorData.message ?? errorData.error ?? 'Failed to run code';
        throw new Error(message);
      }

      const data = await response.json() as RunCodeApiResponse;
      setTestResults(data.testResults ?? []);

      const passed = data.testResults?.filter((r) => r.passed).length ?? 0;
      const total = data.testResults?.length ?? 0;

      if (passed === total && total > 0) {
        toast.success(`All ${total} test cases passed!`);
      } else {
        toast.info(`${passed}/${total} test cases passed`);
      }
    } catch (error) {
      console.error('Run code error:', error);
      const message = error instanceof Error ? error.message : 'Failed to run code. Please try again.';
      toast.error(message);
    } finally {
      setIsRunning(false);
    }
  };

  // Submit final solution
  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/interview/${sessionId}/code/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          challengeId: challenge.id,
          hintsUsed: hintsRevealed,
          timeSpent: challenge.timeLimitSeconds - timeRemaining,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string };
        const message = errorData.message ?? errorData.error ?? 'Failed to submit code';
        throw new Error(message);
      }

      const data = await response.json() as SubmitCodeApiResponse;

      toast.success('Solution submitted!');
      onSubmit?.(code, language);

      if (data.evaluation) {
        onComplete?.(data.evaluation);
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reveal next hint
  const handleRevealHint = (): void => {
    if (hintsRevealed < challenge.hints.length) {
      setHintsRevealed((prev) => prev + 1);
      toast.info(`Hint ${hintsRevealed + 1} revealed`);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Left Panel - Problem Description */}
      <div className="lg:w-2/5 flex flex-col gap-4">
        {/* Problem Header */}
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
          <button
            onClick={() => setShowDescription(!showDescription)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-white">{challenge.title}</h2>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  challenge.difficulty <= 3 && 'bg-green-500/20 text-green-400',
                  challenge.difficulty > 3 && challenge.difficulty <= 6 && 'bg-yellow-500/20 text-yellow-400',
                  challenge.difficulty > 6 && 'bg-red-500/20 text-red-400'
                )}
              >
                {challenge.difficulty <= 3 ? 'Easy' : challenge.difficulty <= 6 ? 'Medium' : 'Hard'}
              </span>
            </div>
            {showDescription ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showDescription && (
            <div className="p-4 prose prose-invert prose-sm max-w-none">
              <div
                className="text-slate-300 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: challenge.description.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>'),
                }}
              />
            </div>
          )}
        </div>

        {/* Hints */}
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-400" />
              <h3 className="font-medium text-white">Hints</h3>
            </div>
            <button
              onClick={handleRevealHint}
              disabled={hintsRevealed >= challenge.hints.length || disabled}
              className="text-xs px-3 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reveal Hint ({hintsRevealed}/{challenge.hints.length})
            </button>
          </div>

          {hintsRevealed > 0 ? (
            <div className="space-y-2">
              {challenge.hints.slice(0, hintsRevealed).map((hint, hintIndex) => (
                <div
                  key={hint}
                  className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-200"
                >
                  <span className="font-medium">Hint {hintIndex + 1}:</span> {hint}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Click &quot;Reveal Hint&quot; if you get stuck. Using hints may affect your score.
            </p>
          )}
        </div>

        {/* Test Results */}
        {showTestResults && testResults.length > 0 && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <h3 className="font-medium text-white mb-3">Test Results</h3>
            <div className="space-y-2">
              {testResults.map((result, testIndex) => (
                <div
                  key={`${result.input}-${result.expected}`}
                  className={cn(
                    'p-3 rounded border text-sm',
                    result.passed
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {result.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <span className={result.passed ? 'text-green-400' : 'text-red-400'}>
                      Test Case {testIndex + 1}
                    </span>
                    {result.timeMs !== undefined && (
                      <span className="text-slate-500 text-xs ml-auto">{result.timeMs}ms</span>
                    )}
                  </div>
                  {!result.passed && (
                    <div className="mt-2 text-xs font-mono">
                      <div className="text-slate-400">Input: {result.input}</div>
                      <div className="text-green-400">Expected: {result.expected}</div>
                      <div className="text-red-400">Got: {result.actual}</div>
                      {result.error && (
                        <div className="text-red-300 mt-1">Error: {result.error}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Code Editor */}
      <div className="lg:w-3/5 flex flex-col gap-4">
        {/* Timer and Controls */}
        <div className="flex items-center justify-between">
          <div className={cn('flex items-center gap-2 font-mono', getTimeColor())}>
            <Clock className="h-4 w-4" />
            <span className="text-lg font-semibold">{formatTime(timeRemaining)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunCode}
              disabled={isRunning || disabled || !code.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Code
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || disabled || !code.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit
            </button>
          </div>
        </div>

        {/* Code Editor */}
        <CodeEditor
          value={code}
          onChange={setCode}
          language={language}
          onLanguageChange={handleLanguageChange}
          availableLanguages={challenge.languages}
          disabled={disabled}
          minHeight="400px"
          className="flex-1"
        />
      </div>
    </div>
  );
}
