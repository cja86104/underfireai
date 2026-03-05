'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Download,
  TrendingUp,
  Target,
  AlertTriangle,
  Loader2,
  Zap,
  Trophy,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SessionSummary {
  id: string;
  date: string;
  type: string;
  company: string | null;
  role: string | null;
  overallScore: number | null;
  strengths: string[];
  improvements: string[];
}

interface RecapReport {
  generatedAt: string;
  totalSessions: number;
  averageScore: number | null;
  creditsUsed: number;
  creditsRemaining: number;
  sessions: SessionSummary[];
  topStrengths: string[];
  topImprovements: string[];
  recommendation: string;
}

interface RecapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecapModal({ isOpen, onClose }: RecapModalProps): React.JSX.Element | null {
  const [report, setReport] = useState<RecapReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRecap();
    }
  }, [isOpen]);

  const fetchRecap = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/recap');
      if (!response.ok) {
        throw new Error('Failed to fetch recap');
      }
      const data = await response.json() as RecapReport;
      setReport(data);
    } catch {
      setError('Unable to load your progress report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = (): void => {
    if (!report) return;

    const text = `
UNDERFIREAI - INTERVIEW PROGRESS REPORT
Generated: ${new Date(report.generatedAt).toLocaleDateString()}

═══════════════════════════════════════════

OVERVIEW
--------
Total Sessions Completed: ${report.totalSessions}
Average Score: ${report.averageScore ?? 'N/A'}%
Credits Used: ${report.creditsUsed}
Credits Remaining: ${report.creditsRemaining}

TOP STRENGTHS
-------------
${report.topStrengths.length > 0 ? report.topStrengths.map((s, i) => `${i + 1}. ${s}`).join('\n') : 'Complete more interviews to identify patterns'}

AREAS FOR IMPROVEMENT
---------------------
${report.topImprovements.length > 0 ? report.topImprovements.map((s, i) => `${i + 1}. ${s}`).join('\n') : 'Complete more interviews to identify patterns'}

RECOMMENDATION
--------------
${report.recommendation}

═══════════════════════════════════════════

SESSION HISTORY
---------------
${report.sessions.map((s) => `
[${new Date(s.date).toLocaleDateString()}] ${s.type.toUpperCase()}
Company: ${s.company || 'General'}
Role: ${s.role || 'Not specified'}
Score: ${s.overallScore ?? 'N/A'}%
`).join('\n')}
`.trim();

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `underfireai-progress-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl" data-lenis-prevent>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2">
              <Zap className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                No Credits Remaining
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Here&apos;s your progress so far
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-orange-500 animate-spin mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Loading your progress...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-8 w-8 text-amber-500 mb-4" />
              <p className="text-slate-600 dark:text-slate-300">{error}</p>
              <button
                onClick={fetchRecap}
                className="mt-4 text-orange-500 hover:text-orange-400 font-medium"
              >
                Try Again
              </button>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">Sessions</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {report.totalSessions}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">Avg Score</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {report.averageScore ?? '—'}
                    {report.averageScore && <span className="text-lg">%</span>}
                  </p>
                </div>
              </div>

              {/* Strengths */}
              {report.topStrengths.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Top Strengths</h3>
                  </div>
                  <ul className="space-y-2">
                    {report.topStrengths.map((strength, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                      >
                        <span className="text-green-500 mt-0.5">✓</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {report.topImprovements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-5 w-5 text-orange-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Focus Areas</h3>
                  </div>
                  <ul className="space-y-2">
                    {report.topImprovements.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                      >
                        <span className="text-orange-500 mt-0.5">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendation */}
              <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {report.recommendation}
                </p>
              </div>

              {/* Download Button */}
              <button
                onClick={downloadReport}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Progress Report
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer CTA */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-gradient-to-t from-white dark:from-slate-900 to-white dark:to-slate-900">
          <Link
            href="/settings?tab=billing"
            className={cn(
              'flex items-center justify-center gap-2 w-full rounded-xl px-6 py-3',
              'bg-orange-500 text-white font-semibold',
              'hover:bg-orange-600 transition-colors'
            )}
          >
            <Zap className="h-5 w-5" />
            Buy More Credits
          </Link>
        </div>
      </div>
    </div>
  );
}
