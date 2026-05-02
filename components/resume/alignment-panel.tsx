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
  if (score === null) return 'text-[#3D3229] dark:text-slate-300';
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
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
      return 'bg-[#FAF8F5] text-[#3D3229] border-[#3D3229]/10';
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
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-xl bg-[#8B5A2B]/10 p-3">
            <FileText className="h-8 w-8 text-[#8B5A2B]" />
          </div>
          <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Resume Alignment</h2>
          <Lock className="h-6 w-6 text-[#3D3229] dark:text-slate-400 ml-auto" />
        </div>
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center rounded-full bg-[#FAF8F5] dark:bg-slate-800 p-5 mb-5 border border-[#3D3229]/10 dark:border-slate-700">
            <Lock className="h-12 w-12 text-[#3D3229] dark:text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-[#3D3229] dark:text-white mb-3">Purchase Required</h3>
          <p className="text-lg text-[#3D3229] dark:text-slate-200 mb-6 max-w-md mx-auto">
            See how your interview performance aligns with your resume claims. Identify gaps and get specific suggestions to improve.
          </p>
          <a href="/settings?tab=billing" className="inline-flex items-center gap-3 rounded-xl bg-orange-500 px-6 py-3 text-lg font-semibold text-white hover:bg-orange-600 transition-colors">
            Get Interview Credits
          </a>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-xl bg-[#8B5A2B]/10 p-3">
            <FileText className="h-8 w-8 text-[#8B5A2B]" />
          </div>
          <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Resume Alignment</h2>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-5" />
            <p className="text-lg text-[#3D3229] dark:text-slate-200">Analyzing resume alignment...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-xl bg-[#8B5A2B]/10 p-3">
            <FileText className="h-8 w-8 text-[#8B5A2B]" />
          </div>
          <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Resume Alignment</h2>
        </div>
        <div className="text-center py-10">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-lg text-[#3D3229] dark:text-slate-200 mb-5">{error}</p>
          <button
            onClick={fetchAlignment}
            className="inline-flex items-center gap-3 rounded-xl bg-orange-500 px-6 py-3 text-lg font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── No data ──
  if (!alignment) {
    return (
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-xl bg-[#8B5A2B]/10 p-3">
            <FileText className="h-8 w-8 text-[#8B5A2B]" />
          </div>
          <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Resume Alignment</h2>
        </div>
        <div className="text-center py-10">
          <p className="text-lg text-[#3D3229] dark:text-slate-200">No alignment data available</p>
          <button
            onClick={fetchAlignment}
            className="mt-5 inline-flex items-center gap-3 rounded-xl bg-orange-500 px-6 py-3 text-lg font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Generate Analysis
          </button>
        </div>
      </div>
    );
  }

  // ── Data ──
  return (
    <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-[#3D3229]/10 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-[#8B5A2B]/10 p-3">
              <FileText className="h-8 w-8 text-[#8B5A2B]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Resume Alignment</h2>
              <p className="text-lg text-[#3D3229] dark:text-slate-200">How your interview matched your resume</p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn('text-5xl font-bold', getScoreColor(alignment.alignmentScore))}>
              {alignment.alignmentScore ?? '—'}%
            </p>
            <p className="text-base text-[#3D3229] dark:text-slate-300">Alignment Score</p>
          </div>
        </div>
      </div>

      {/* Discrepancies */}
      {alignment.discrepancies.length > 0 && (
        <div className="border-b border-[#3D3229]/10 dark:border-slate-800">
          <button
            onClick={() => setExpanded((e) => ({ ...e, discrepancies: !e.discrepancies }))}
            className="w-full flex items-center justify-between p-6 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-7 w-7 text-amber-500" />
              <span className="text-xl font-bold text-[#3D3229] dark:text-white">
                Discrepancies ({alignment.discrepancies.length})
              </span>
            </div>
            {expanded.discrepancies
              ? <ChevronUp className="h-7 w-7 text-[#3D3229] dark:text-slate-300" />
              : <ChevronDown className="h-7 w-7 text-[#3D3229] dark:text-slate-300" />}
          </button>
          {expanded.discrepancies && (
            <div className="px-6 pb-6 space-y-4">
              {alignment.discrepancies.map((d, i) => (
                <div key={i} className={cn('rounded-xl border p-5', getSeverityStyles(d.severity))}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="text-lg font-bold text-[#3D3229] dark:text-white leading-snug">
                      &ldquo;{d.claim}&rdquo;
                    </p>
                    <span className={cn('flex-shrink-0 text-base px-3 py-1 rounded-full border font-semibold capitalize', getSeverityBadgeStyles(d.severity))}>
                      {d.severity}
                    </span>
                  </div>
                  <p className="text-lg text-[#3D3229] dark:text-slate-200 mb-4">{d.evidence}</p>
                  {d.suggestion && (
                    <div className="flex items-start gap-3 bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-[#3D3229]/10 dark:border-slate-700">
                      <Lightbulb className="h-6 w-6 text-[#8B5A2B] flex-shrink-0 mt-0.5" />
                      <p className="text-lg text-[#3D3229] dark:text-slate-200">{d.suggestion}</p>
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
            className="w-full flex items-center justify-between p-6 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
              <span className="text-xl font-bold text-[#3D3229] dark:text-white">
                Confirmed Claims ({alignment.confirmations.length})
              </span>
            </div>
            {expanded.confirmations
              ? <ChevronUp className="h-7 w-7 text-[#3D3229] dark:text-slate-300" />
              : <ChevronDown className="h-7 w-7 text-[#3D3229] dark:text-slate-300" />}
          </button>
          {expanded.confirmations && (
            <div className="px-6 pb-6 space-y-4">
              {alignment.confirmations.map((c, i) => (
                <div key={i} className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800/30 p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-lg font-bold text-[#3D3229] dark:text-white">&ldquo;{c.claim}&rdquo;</p>
                  </div>
                  <p className="text-lg text-[#3D3229] dark:text-slate-200 pl-9">{c.evidence}</p>
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
            className="w-full flex items-center justify-between p-6 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <Lightbulb className="h-7 w-7 text-[#8B5A2B]" />
              <span className="text-xl font-bold text-[#3D3229] dark:text-white">
                Resume Suggestions ({alignment.suggestions.length})
              </span>
            </div>
            {expanded.suggestions
              ? <ChevronUp className="h-7 w-7 text-[#3D3229] dark:text-slate-300" />
              : <ChevronDown className="h-7 w-7 text-[#3D3229] dark:text-slate-300" />}
          </button>
          {expanded.suggestions && (
            <div className="px-6 pb-6 space-y-4">
              {alignment.suggestions.map((s, i) => {
                const typeStyles = {
                  add: 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30',
                  modify: 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/30',
                  remove: 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/30',
                }[s.type] ?? 'bg-[#FAF8F5] border-[#3D3229]/10';

                const badgeStyles = {
                  add: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
                  modify: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
                  remove: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
                }[s.type] ?? 'bg-[#FAF8F5] text-[#3D3229] border-[#3D3229]/10';

                return (
                  <div key={i} className={cn('rounded-xl border p-5', typeStyles)}>
                    <span className={cn('inline-block text-base px-4 py-1.5 rounded-full border font-bold uppercase mb-4', badgeStyles)}>
                      {s.type}
                    </span>
                    {s.currentText && (
                      <div className="mb-4">
                        <p className="text-base font-bold text-[#3D3229] dark:text-slate-300 mb-2">Current:</p>
                        <p className="text-lg text-[#3D3229] dark:text-slate-300 line-through">{s.currentText}</p>
                      </div>
                    )}
                    <div className="mb-3">
                      <p className="text-base font-bold text-[#3D3229] dark:text-slate-300 mb-2">{s.type === 'add' ? 'Add:' : 'Suggested:'}</p>
                      <p className="text-lg font-semibold text-[#3D3229] dark:text-white">{s.suggestedText}</p>
                    </div>
                    <p className="text-lg text-[#3D3229] dark:text-slate-200">{s.reason}</p>
                    {s.sourceQuote && (
                      <p className="text-base text-[#3D3229] dark:text-slate-300 mt-4 italic border-l-4 border-[#3D3229]/20 dark:border-slate-600 pl-4">
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
          <div className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <p className="text-xl text-[#3D3229] dark:text-slate-200">Perfect alignment — no discrepancies found.</p>
          </div>
        )}
    </div>
  );
}
