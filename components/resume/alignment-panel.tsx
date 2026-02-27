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

interface ApiResponse {
  insight?: AlignmentData;
  message?: string;
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-[#6B5744]';
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function getSeverityStyles(severity: string): string {
  switch (severity) {
    case 'high':
      return 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/30';
    case 'medium':
      return 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/30';
    case 'low':
      return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800/30';
    default:
      return 'bg-[#FAF8F5] border-[#3D3229]/10';
  }
}

function getSeverityBadgeStyles(severity: string): string {
  switch (severity) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30';
    case 'low':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30';
    default:
      return 'bg-[#FAF8F5] text-[#6B5744] border-[#3D3229]/10';
  }
}

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

  const fetchAlignment = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const getResponse = await fetch(`/api/resume/analyze-alignment?sessionId=${sessionId}`);

      if (getResponse.ok) {
        const data = (await getResponse.json()) as ApiResponse;
        setAlignment(data.insight ?? null);
        setLoading(false);
        return;
      }

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

  useEffect(() => {
    if (isPaidUser) {
      void fetchAlignment();
    }
  }, [isPaidUser, fetchAlignment]);

  // ── Locked ──
  if (!isPaidUser) {
    return (
      <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-[#8B5A2B]/10 p-2">
            <FileText className="h-5 w-5 text-[#8B5A2B]" />
          </div>
          <h2 className="text-lg font-semibold text-[#3D3229] dark:text-white">Resume Alignment</h2>
          <Lock className="h-4 w-4 text-[#8B7355] ml-auto" />
        </div>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center rounded-full bg-[#FAF8F5] p-4 mb-4 border border-[#3D3229]/10">
            <Lock className="h-8 w-8 text-[#8B7355]" />
          </div>
          <h3 className="text-lg font-semibold text-[#3D3229] dark:text-white mb-2">Upgrade to Pro</h3>
          <p className="text-base text-[#6B5744] mb-4 max-w-md mx-auto">
            See how your interview performance aligns with your resume claims. Identify gaps and get specific suggestions to improve.
          </p>
          <a href="/settings?tab=billing" className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">
            Upgrade Now
          </a>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-[#8B5A2B]/10 p-2">
            <FileText className="h-5 w-5 text-[#8B5A2B]" />
          </div>
          <h2 className="text-lg font-semibold text-[#3D3229] dark:text-white">Resume Alignment</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-base text-[#6B5744]">Analyzing resume alignment...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-[#8B5A2B]/10 p-2">
            <FileText className="h-5 w-5 text-[#8B5A2B]" />
          </div>
          <h2 className="text-lg font-semibold text-[#3D3229] dark:text-white">Resume Alignment</h2>
        </div>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center rounded-full bg-red-50 border border-red-200 p-4 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-[#3D3229] dark:text-white mb-2">
            {error.includes('resume') ? 'No Resume Found' : 'Analysis Failed'}
          </h3>
          <p className="text-base text-[#6B5744] mb-4 max-w-md mx-auto">
            {error.includes('resume')
              ? 'Upload a resume to see how your interview performance aligns with your experience.'
              : error}
          </p>
          {error.includes('resume') ? (
            <a href="/resume" className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">
              Upload Resume
            </a>
          ) : (
            <button
              onClick={fetchAlignment}
              className="inline-flex items-center gap-2 rounded-lg border border-[#3D3229]/20 bg-[#FAF8F5] px-4 py-2 text-sm font-medium text-[#3D3229] hover:bg-[#3D3229]/10 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── No data ──
  if (!alignment) {
    return (
      <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-[#8B5A2B]/10 p-2">
            <FileText className="h-5 w-5 text-[#8B5A2B]" />
          </div>
          <h2 className="text-lg font-semibold text-[#3D3229] dark:text-white">Resume Alignment</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-base text-[#6B5744]">No alignment data available</p>
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

  // ── Data ──
  return (
    <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#3D3229]/10 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#8B5A2B]/10 p-2">
              <FileText className="h-5 w-5 text-[#8B5A2B]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Resume Alignment</h2>
              <p className="text-sm text-[#6B5744] dark:text-slate-400">How your interview matched your resume</p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn('text-3xl font-bold', getScoreColor(alignment.alignmentScore))}>
              {alignment.alignmentScore ?? '—'}%
            </p>
            <p className="text-xs text-[#8B7355]">Alignment Score</p>
          </div>
        </div>
      </div>

      {/* Discrepancies */}
      {alignment.discrepancies.length > 0 && (
        <div className="border-b border-[#3D3229]/10 dark:border-slate-800">
          <button
            onClick={() => setExpanded((e) => ({ ...e, discrepancies: !e.discrepancies }))}
            className="w-full flex items-center justify-between p-5 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="font-semibold text-[#3D3229] dark:text-white">
                Discrepancies ({alignment.discrepancies.length})
              </span>
            </div>
            {expanded.discrepancies
              ? <ChevronUp className="h-5 w-5 text-[#8B7355]" />
              : <ChevronDown className="h-5 w-5 text-[#8B7355]" />}
          </button>
          {expanded.discrepancies && (
            <div className="px-5 pb-5 space-y-3">
              {alignment.discrepancies.map((d, i) => (
                <div key={i} className={cn('rounded-lg border p-4', getSeverityStyles(d.severity))}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-semibold text-[#3D3229] dark:text-white text-sm leading-snug">
                      &ldquo;{d.claim}&rdquo;
                    </p>
                    <span className={cn('flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium capitalize', getSeverityBadgeStyles(d.severity))}>
                      {d.severity}
                    </span>
                  </div>
                  <p className="text-sm text-[#3D3229]/80 dark:text-slate-300 mb-3">{d.evidence}</p>
                  {d.suggestion && (
                    <div className="flex items-start gap-2 bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-[#3D3229]/8">
                      <Lightbulb className="h-4 w-4 text-[#8B5A2B] flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-[#3D3229]/80">{d.suggestion}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmations */}
      {alignment.confirmations.length > 0 && (
        <div className="border-b border-[#3D3229]/10 dark:border-slate-800">
          <button
            onClick={() => setExpanded((e) => ({ ...e, confirmations: !e.confirmations }))}
            className="w-full flex items-center justify-between p-5 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-[#3D3229] dark:text-white">
                Confirmed Claims ({alignment.confirmations.length})
              </span>
            </div>
            {expanded.confirmations
              ? <ChevronUp className="h-5 w-5 text-[#8B7355]" />
              : <ChevronDown className="h-5 w-5 text-[#8B7355]" />}
          </button>
          {expanded.confirmations && (
            <div className="px-5 pb-5 space-y-3">
              {alignment.confirmations.map((c, i) => (
                <div key={i} className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800/30 p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="font-semibold text-[#3D3229] dark:text-white text-sm">&ldquo;{c.claim}&rdquo;</p>
                  </div>
                  <p className="text-sm text-[#3D3229]/80 dark:text-slate-300 pl-6">{c.evidence}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      {alignment.suggestions.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded((e) => ({ ...e, suggestions: !e.suggestions }))}
            className="w-full flex items-center justify-between p-5 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lightbulb className="h-5 w-5 text-[#8B5A2B]" />
              <span className="font-semibold text-[#3D3229] dark:text-white">
                Resume Suggestions ({alignment.suggestions.length})
              </span>
            </div>
            {expanded.suggestions
              ? <ChevronUp className="h-5 w-5 text-[#8B7355]" />
              : <ChevronDown className="h-5 w-5 text-[#8B7355]" />}
          </button>
          {expanded.suggestions && (
            <div className="px-5 pb-5 space-y-3">
              {alignment.suggestions.map((s, i) => {
                const typeStyles = {
                  add: 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30',
                  modify: 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/30',
                  remove: 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/30',
                }[s.type] ?? 'bg-[#FAF8F5] border-[#3D3229]/10';

                const badgeStyles = {
                  add: 'bg-green-100 text-green-700 border-green-200',
                  modify: 'bg-amber-100 text-amber-700 border-amber-200',
                  remove: 'bg-red-100 text-red-700 border-red-200',
                }[s.type] ?? 'bg-[#FAF8F5] text-[#6B5744] border-[#3D3229]/10';

                return (
                  <div key={i} className={cn('rounded-lg border p-4', typeStyles)}>
                    <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full border font-bold uppercase mb-3', badgeStyles)}>
                      {s.type}
                    </span>
                    {s.currentText && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-[#8B7355] mb-1">Current:</p>
                        <p className="text-sm text-[#6B5744] line-through">{s.currentText}</p>
                      </div>
                    )}
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-[#8B7355] mb-1">{s.type === 'add' ? 'Add:' : 'Suggested:'}</p>
                      <p className="text-sm font-medium text-[#3D3229] dark:text-white">{s.suggestedText}</p>
                    </div>
                    <p className="text-sm text-[#3D3229]/70">{s.reason}</p>
                    {s.sourceQuote && (
                      <p className="text-xs text-[#8B7355] mt-2 italic border-l-2 border-[#3D3229]/20 pl-2">
                        From interview: &ldquo;{s.sourceQuote}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty */}
      {alignment.discrepancies.length === 0 &&
        alignment.confirmations.length === 0 &&
        alignment.suggestions.length === 0 && (
          <div className="p-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-base text-[#6B5744]">Perfect alignment — no discrepancies found.</p>
          </div>
        )}
    </div>
  );
}
