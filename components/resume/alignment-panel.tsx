'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// ===========================================
// TYPES
// ===========================================

interface AlignmentDiscrepancy {
  claim: string;
  evidence: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

interface AlignmentConfirmation {
  claim: string;
  evidence: string;
}

interface ResumeSuggestion {
  type: 'add' | 'modify' | 'remove';
  currentText: string | null;
  suggestedText: string;
  reason: string;
  sourceQuote?: string;
}

interface AlignmentData {
  alignmentScore: number | null;
  discrepancies: AlignmentDiscrepancy[];
  confirmations: AlignmentConfirmation[];
  suggestions: ResumeSuggestion[];
}

interface ResumeAlignmentPanelProps {
  sessionId: string;
  isPaidUser: boolean;
}

// ===========================================
// COMPONENT
// ===========================================

export function ResumeAlignmentPanel({
  sessionId,
  isPaidUser,
}: ResumeAlignmentPanelProps): React.JSX.Element {
  const [alignment, setAlignment] = useState<AlignmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState({
    discrepancies: true,
    confirmations: false,
    suggestions: true,
  });

  interface ApiResponse {
    insight?: AlignmentData;
    message?: string;
  }

  const fetchAlignment = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // First try to get existing analysis
      const getResponse = await fetch(`/api/resume/analyze-alignment?sessionId=${sessionId}`);

      if (getResponse.ok) {
        const data = (await getResponse.json()) as ApiResponse;
        setAlignment(data.insight ?? null);
        setLoading(false);
        return;
      }

      // If not found, generate new analysis
      if (getResponse.status === 404) {
        const postResponse = await fetch('/api/resume/analyze-alignment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!postResponse.ok) {
          const errorData = (await postResponse.json()) as ApiResponse;
          throw new Error(errorData.message ?? 'Failed to analyze alignment');
        }

        const data = (await postResponse.json()) as ApiResponse;
        setAlignment(data.insight ?? null);
      } else {
        const errorData = (await getResponse.json()) as ApiResponse;
        throw new Error(errorData.message ?? 'Failed to fetch alignment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Fetch alignment data on mount
  useEffect(() => {
    if (isPaidUser) {
      void fetchAlignment();
    }
  }, [isPaidUser, fetchAlignment]);

  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'text-slate-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // Locked state for free users
  if (!isPaidUser) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-purple-500/10 p-2">
            <FileText className="h-5 w-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Resume Alignment</h2>
          <Lock className="h-4 w-4 text-slate-500 ml-auto" />
        </div>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center rounded-full bg-slate-800 p-4 mb-4">
            <Lock className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            Upgrade to Pro
          </h3>
          <p className="text-slate-400 mb-4 max-w-md mx-auto">
            See how your interview performance aligns with your resume claims.
            Identify gaps and get specific suggestions to improve.
          </p>
          <a
            href="/settings?tab=billing"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Upgrade Now
          </a>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-purple-500/10 p-2">
            <FileText className="h-5 w-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Resume Alignment</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-slate-400">Analyzing resume alignment...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-purple-500/10 p-2">
            <FileText className="h-5 w-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Resume Alignment</h2>
        </div>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center rounded-full bg-red-500/10 p-4 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {error.includes('resume') ? 'No Resume Found' : 'Analysis Failed'}
          </h3>
          <p className="text-slate-400 mb-4 max-w-md mx-auto">
            {error.includes('resume')
              ? 'Upload a resume to see how your interview performance aligns with your experience.'
              : error}
          </p>
          {error.includes('resume') ? (
            <a
              href="/settings?tab=resume"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Upload Resume
            </a>
          ) : (
            <button
              onClick={fetchAlignment}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // No data state
  if (!alignment) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-purple-500/10 p-2">
            <FileText className="h-5 w-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Resume Alignment</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-400">No alignment data available</p>
          <button
            onClick={fetchAlignment}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Generate Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      {/* Header with Score */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <FileText className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Resume Alignment</h2>
              <p className="text-sm text-slate-400">
                How your interview matched your resume
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn('text-3xl font-bold', getScoreColor(alignment.alignmentScore))}>
              {alignment.alignmentScore ?? '—'}%
            </p>
            <p className="text-xs text-slate-500">Alignment Score</p>
          </div>
        </div>
      </div>

      {/* Discrepancies Section */}
      {alignment.discrepancies.length > 0 && (
        <div className="border-b border-slate-800">
          <button
            onClick={() => setExpanded((e) => ({ ...e, discrepancies: !e.discrepancies }))}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <span className="font-medium text-white">
                Discrepancies ({alignment.discrepancies.length})
              </span>
            </div>
            {expanded.discrepancies ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {expanded.discrepancies && (
            <div className="px-4 pb-4 space-y-3">
              {alignment.discrepancies.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg border p-4',
                    getSeverityColor(d.severity)
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-white text-sm">
                      &ldquo;{d.claim}&rdquo;
                    </p>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full capitalize',
                        getSeverityColor(d.severity)
                      )}
                    >
                      {d.severity}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{d.evidence}</p>
                  {d.suggestion && (
                    <p className="text-xs text-slate-400 flex items-start gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      {d.suggestion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmations Section */}
      {alignment.confirmations.length > 0 && (
        <div className="border-b border-slate-800">
          <button
            onClick={() => setExpanded((e) => ({ ...e, confirmations: !e.confirmations }))}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="font-medium text-white">
                Confirmed Claims ({alignment.confirmations.length})
              </span>
            </div>
            {expanded.confirmations ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {expanded.confirmations && (
            <div className="px-4 pb-4 space-y-3">
              {alignment.confirmations.map((c, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-green-500/20 bg-green-500/10 p-4"
                >
                  <p className="font-medium text-white text-sm mb-2">
                    &ldquo;{c.claim}&rdquo;
                  </p>
                  <p className="text-sm text-slate-300">{c.evidence}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggestions Section */}
      {alignment.suggestions.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded((e) => ({ ...e, suggestions: !e.suggestions }))}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lightbulb className="h-5 w-5 text-blue-400" />
              <span className="font-medium text-white">
                Resume Suggestions ({alignment.suggestions.length})
              </span>
            </div>
            {expanded.suggestions ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {expanded.suggestions && (
            <div className="px-4 pb-4 space-y-3">
              {alignment.suggestions.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        s.type === 'add'
                          ? 'bg-green-500/20 text-green-400'
                          : s.type === 'remove'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                      )}
                    >
                      {s.type.toUpperCase()}
                    </span>
                  </div>
                  {s.currentText && (
                    <div className="mb-2">
                      <p className="text-xs text-slate-500 mb-1">Current:</p>
                      <p className="text-sm text-slate-400 line-through">
                        {s.currentText}
                      </p>
                    </div>
                  )}
                  <div className="mb-2">
                    <p className="text-xs text-slate-500 mb-1">
                      {s.type === 'add' ? 'Add:' : 'Suggested:'}
                    </p>
                    <p className="text-sm text-white">{s.suggestedText}</p>
                  </div>
                  <p className="text-xs text-slate-400">{s.reason}</p>
                  {s.sourceQuote && (
                    <p className="text-xs text-slate-500 mt-2 italic">
                      From interview: &ldquo;{s.sourceQuote}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {alignment.discrepancies.length === 0 &&
        alignment.confirmations.length === 0 &&
        alignment.suggestions.length === 0 && (
          <div className="p-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <p className="text-slate-300">Perfect alignment! No discrepancies found.</p>
          </div>
        )}
    </div>
  );
}
