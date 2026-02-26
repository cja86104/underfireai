'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  Loader2,
  FileText,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// ===========================================
// TYPES
// ===========================================

interface HealthScoreData {
  score: number;
  alignmentAvg: number | null;
  vulnerabilityScore: number | null;
  insightsCount: number;
}

interface ResumeHealthScoreProps {
  isPaidUser: boolean;
}

// ===========================================
// COMPONENT
// ===========================================

interface ApiResponse {
  healthScore: number;
  healthDetails?: {
    alignmentAvg: number | null;
    vulnerabilityScore: number | null;
    insightsCount: number;
  };
}

export function ResumeHealthScore({
  isPaidUser,
}: ResumeHealthScoreProps): React.JSX.Element {
  const [health, setHealth] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const response = await fetch('/api/resume/suggestions');

      if (!response.ok) {
        if (response.status === 404) {
          // No data yet, that's okay
          setHealth(null);
          return;
        }
        return;
      }

      const data = (await response.json()) as ApiResponse;
      setHealth({
        score: data.healthScore,
        alignmentAvg: data.healthDetails?.alignmentAvg ?? null,
        vulnerabilityScore: data.healthDetails?.vulnerabilityScore ?? null,
        insightsCount: data.healthDetails?.insightsCount ?? 0,
      });
    } catch {
      // Silently fail - component will show "no data" state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPaidUser) {
      void fetchHealth();
    }
  }, [isPaidUser, fetchHealth]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  const getTrendIcon = (score: number): React.ReactNode => {
    if (score >= 70) return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (score >= 50) return <Minus className="h-4 w-4 text-slate-400" />;
    return <TrendingDown className="h-4 w-4 text-red-400" />;
  };

  // Locked state for free users
  if (!isPaidUser) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold text-white">Resume Health</h3>
          </div>
          <Lock className="h-4 w-4 text-slate-500" />
        </div>
        <p className="text-sm text-slate-400 mb-3">
          Track how your resume performs across interviews.
        </p>
        <Link
          href="/settings?tab=billing"
          className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
        >
          Upgrade to unlock
        </Link>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-white">Resume Health</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  // No data state
  if (!health || health.insightsCount === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-white">Resume Health</h3>
        </div>
        <p className="text-sm text-slate-400 mb-3">
          Complete interviews to build your resume health score.
        </p>
        <Link
          href="/interview/new"
          className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
        >
          Start practicing
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-white">Resume Health</h3>
        </div>
        {getTrendIcon(health.score)}
      </div>

      {/* Main Score */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative h-16 w-16">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-slate-700"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(health.score / 100) * 100} 100`}
              className={getScoreBgColor(health.score)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-lg font-bold', getScoreColor(health.score))}>
              {health.score}
            </span>
          </div>
        </div>
        <div>
          <p className={cn('text-lg font-semibold', getScoreColor(health.score))}>
            {getScoreLabel(health.score)}
          </p>
          <p className="text-xs text-slate-500">
            Based on {health.insightsCount} insight{health.insightsCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        {health.alignmentAvg !== null && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <FileText className="h-4 w-4" />
              <span>Alignment</span>
            </div>
            <span
              className={cn(
                'font-medium',
                health.alignmentAvg >= 70
                  ? 'text-green-400'
                  : health.alignmentAvg >= 50
                  ? 'text-amber-400'
                  : 'text-red-400'
              )}
            >
              {health.alignmentAvg}%
            </span>
          </div>
        )}

        {health.vulnerabilityScore !== null && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Shield className="h-4 w-4" />
              <span>Defense</span>
            </div>
            <span
              className={cn(
                'font-medium',
                health.vulnerabilityScore <= 30
                  ? 'text-green-400'
                  : health.vulnerabilityScore <= 60
                  ? 'text-amber-400'
                  : 'text-red-400'
              )}
            >
              {100 - health.vulnerabilityScore}%
            </span>
          </div>
        )}
      </div>

      {/* Quick Action */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <Link
          href="/dashboard/resume-insights"
          className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
        >
          View detailed insights
        </Link>
      </div>
    </div>
  );
}
