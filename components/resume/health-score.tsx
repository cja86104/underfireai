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
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
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
    if (score >= 70) return <TrendingUp className="h-6 w-6 text-green-500" />;
    if (score >= 50) return <Minus className="h-6 w-6 text-[#3D3229] dark:text-slate-200" />;
    return <TrendingDown className="h-6 w-6 text-red-500" />;
  };

  // Locked state for free users
  if (!isPaidUser) {
    return (
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-purple-500" />
            <h3 className="text-xl font-bold text-[#3D3229] dark:text-white">Resume Health</h3>
          </div>
          <Lock className="h-6 w-6 text-[#3D3229] dark:text-slate-400" />
        </div>
        <p className="text-lg text-[#3D3229] dark:text-slate-200 mb-4">
          Track how your resume performs across interviews.
        </p>
        <Link
          href="/settings?tab=billing"
          className="text-lg text-orange-500 hover:text-orange-400 transition-colors font-semibold"
        >
          Upgrade to unlock
        </Link>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-8 w-8 text-purple-500" />
          <h3 className="text-xl font-bold text-[#3D3229] dark:text-white">Resume Health</h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-[#3D3229] dark:text-slate-200" />
        </div>
      </div>
    );
  }

  // No data state
  if (!health || health.insightsCount === 0) {
    return (
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-8 w-8 text-purple-500" />
          <h3 className="text-xl font-bold text-[#3D3229] dark:text-white">Resume Health</h3>
        </div>
        <p className="text-lg text-[#3D3229] dark:text-slate-200 mb-4">
          Complete interviews to build your resume health score.
        </p>
        <Link
          href="/interview/new"
          className="text-lg text-orange-500 hover:text-orange-400 transition-colors font-semibold"
        >
          Start practicing
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-purple-500" />
          <h3 className="text-xl font-bold text-[#3D3229] dark:text-white">Resume Health</h3>
        </div>
        {getTrendIcon(health.score)}
      </div>

      {/* Main Score */}
      <div className="flex items-center gap-5 mb-5">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-[#3D3229]/20 dark:text-slate-700"
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
            <span className={cn('text-2xl font-bold', getScoreColor(health.score))}>
              {health.score}
            </span>
          </div>
        </div>
        <div>
          <p className={cn('text-2xl font-bold', getScoreColor(health.score))}>
            {getScoreLabel(health.score)}
          </p>
          <p className="text-base text-[#3D3229] dark:text-slate-200">
            Based on {health.insightsCount} insight{health.insightsCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        {health.alignmentAvg !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[#3D3229] dark:text-slate-200">
              <FileText className="h-6 w-6" />
              <span className="text-lg">Alignment</span>
            </div>
            <span
              className={cn(
                'text-lg font-bold',
                health.alignmentAvg >= 70
                  ? 'text-green-500'
                  : health.alignmentAvg >= 50
                  ? 'text-amber-500'
                  : 'text-red-500'
              )}
            >
              {health.alignmentAvg}%
            </span>
          </div>
        )}

        {health.vulnerabilityScore !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[#3D3229] dark:text-slate-200">
              <Shield className="h-6 w-6" />
              <span className="text-lg">Defense</span>
            </div>
            <span
              className={cn(
                'text-lg font-bold',
                health.vulnerabilityScore <= 30
                  ? 'text-green-500'
                  : health.vulnerabilityScore <= 60
                  ? 'text-amber-500'
                  : 'text-red-500'
              )}
            >
              {100 - health.vulnerabilityScore}%
            </span>
          </div>
        )}
      </div>

      {/* Quick Action */}
      <div className="mt-5 pt-5 border-t border-[#3D3229]/10 dark:border-slate-800">
        <Link
          href="/resume-insights"
          className="text-lg text-orange-500 hover:text-orange-400 transition-colors font-semibold"
        >
          View detailed insights
        </Link>
      </div>
    </div>
  );
}
