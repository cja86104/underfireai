'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Play,
  Loader2,
  Target,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// ===========================================
// TYPES
// ===========================================

interface NarrativeGap {
  area: string;
  gapDescription: string;
  coachingTip: string;
  severity: 'critical' | 'moderate' | 'minor';
}

interface GapAnalysisResult {
  matchPercentage: number;
  matchedSkills: string[];
  missingRequired: string[];
  missingPreferred: string[];
  additionalSkills: string[];
  narrativeGaps: NarrativeGap[];
  strengths: string[];
  recommendations: string[];
}

interface JobDescriptionInfo {
  id: string;
  companyName: string | null;
  roleTitle: string | null;
}

interface GapResultsProps {
  jd: JobDescriptionInfo;
  analysis: GapAnalysisResult | null;
  onAnalyze: () => Promise<void>;
  analyzing: boolean;
}

// ===========================================
// COMPONENT
// ===========================================

export function GapResults({
  jd,
  analysis,
  onAnalyze,
  analyzing,
}: GapResultsProps): React.JSX.Element {
  const [expanded, setExpanded] = useState({
    matched: false,
    missing: true,
    narrative: true,
    additional: false,
  });
  const [generatingPractice, setGeneratingPractice] = useState(false);
  const [practiceUrl, setPracticeUrl] = useState<string | null>(null);

  const getMatchColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getMatchBgColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const handleGeneratePractice = async (): Promise<void> => {
    setGeneratingPractice(true);
    try {
      const response = await fetch(`/api/job-description/${jd.id}/generate-practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? 'Failed to generate practice');
      }

      const data = (await response.json()) as { startUrl: string };
      setPracticeUrl(data.startUrl);
    } catch (err) {
      console.error('Generate practice error:', err);
    } finally {
      setGeneratingPractice(false);
    }
  };

  // Not yet analyzed
  if (!analysis) {
    return (
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-10">
        <div className="text-center py-12">
          <Target className="h-16 w-16 text-[#8B7355] dark:text-slate-500 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-[#3D3229] dark:text-white mb-3">
            Ready to Analyze
          </h3>
          <p className="text-lg text-[#6B5744] dark:text-slate-400 mb-8 max-w-lg mx-auto">
            Compare this job description against your resume to identify skill
            gaps and get targeted practice recommendations.
          </p>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className={cn(
              'inline-flex items-center gap-3 rounded-xl px-8 py-4 text-lg font-semibold transition-colors',
              'bg-orange-500 text-white hover:bg-orange-600',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="h-6 w-6" />
                Run Gap Analysis
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Match Score Card */}
      <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-amber-500/5 dark:from-orange-500/10 dark:to-amber-500/10 p-8">
        {/* Header with Score Ring */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-[#3D3229] dark:text-white mb-1">
              {jd.roleTitle ?? 'Job'} at {jd.companyName ?? 'Company'}
            </h3>
            <p className="text-lg text-[#6B5744] dark:text-slate-400">Gap Analysis Results</p>
          </div>
          
          {/* Score Ring - Made larger */}
          <div className="text-right">
            <div className="relative h-24 w-24">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-[#3D3229]/10 dark:text-slate-700"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${analysis.matchPercentage} 100`}
                  className={getMatchBgColor(analysis.matchPercentage)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn('text-2xl font-bold', getMatchColor(analysis.matchPercentage))}>
                  {analysis.matchPercentage}%
                </span>
              </div>
            </div>
            <p className="text-base text-[#6B5744] dark:text-slate-400 mt-2 font-medium">Match</p>
          </div>
        </div>

        {/* Quick Stats - Larger boxes */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="rounded-xl bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 p-5 text-center">
            <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-1">
              {analysis.matchedSkills.length}
            </p>
            <p className="text-base text-green-700 dark:text-green-300 font-medium">Matched</p>
          </div>
          <div className="rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 p-5 text-center">
            <p className="text-4xl font-bold text-red-600 dark:text-red-400 mb-1">
              {analysis.missingRequired.length}
            </p>
            <p className="text-base text-red-700 dark:text-red-300 font-medium">Missing (Required)</p>
          </div>
          <div className="rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 p-5 text-center">
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {analysis.additionalSkills.length}
            </p>
            <p className="text-base text-blue-700 dark:text-blue-300 font-medium">Unique to You</p>
          </div>
        </div>

        {/* Practice Button - Larger */}
        {practiceUrl ? (
          <Link
            href={practiceUrl}
            className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-orange-500 px-6 py-4 text-lg font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            <Play className="h-6 w-6" />
            Start Practice Interview
          </Link>
        ) : (
          <button
            onClick={handleGeneratePractice}
            disabled={generatingPractice}
            className={cn(
              'w-full inline-flex items-center justify-center gap-3 rounded-xl px-6 py-4 text-lg font-semibold transition-colors',
              'bg-orange-500 text-white hover:bg-orange-600',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {generatingPractice ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-6 w-6" />
                Generate Practice Interview
              </>
            )}
          </button>
        )}
      </div>

      {/* Narrative Gaps / Experience Gaps */}
      {analysis.narrativeGaps.length > 0 && (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-900/50 overflow-hidden">
          <button
            onClick={() => setExpanded((e) => ({ ...e, narrative: !e.narrative }))}
            className="w-full flex items-center justify-between p-6 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-amber-500/10 p-3">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <span className="text-xl font-semibold text-[#3D3229] dark:text-white">
                Experience Gaps ({analysis.narrativeGaps.length})
              </span>
            </div>
            {expanded.narrative ? (
              <ChevronUp className="h-6 w-6 text-[#6B5744] dark:text-slate-400" />
            ) : (
              <ChevronDown className="h-6 w-6 text-[#6B5744] dark:text-slate-400" />
            )}
          </button>
          {expanded.narrative && (
            <div className="px-6 pb-6 space-y-4">
              {analysis.narrativeGaps.map((gap, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl border p-6',
                    gap.severity === 'critical'
                      ? 'border-red-500/30 bg-red-500/5 dark:bg-red-500/10'
                      : gap.severity === 'moderate'
                      ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10'
                      : 'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="text-lg font-semibold text-[#3D3229] dark:text-white">{gap.area}</p>
                    <span
                      className={cn(
                        'text-sm px-3 py-1 rounded-full capitalize font-medium',
                        gap.severity === 'critical'
                          ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                          : gap.severity === 'moderate'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      )}
                    >
                      {gap.severity}
                    </span>
                  </div>
                  <p className="text-base text-[#6B5744] dark:text-slate-300 mb-4 leading-relaxed">
                    {gap.gapDescription}
                  </p>
                  <div className="flex items-start gap-3 text-base text-[#8B7355] dark:text-slate-400 bg-[#FAF8F5] dark:bg-slate-800/50 rounded-lg p-4">
                    <Lightbulb className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-500" />
                    <span>{gap.coachingTip}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Missing Required Skills */}
      {analysis.missingRequired.length > 0 && (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-900/50 overflow-hidden">
          <button
            onClick={() => setExpanded((e) => ({ ...e, missing: !e.missing }))}
            className="w-full flex items-center justify-between p-6 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-red-500/10 p-3">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <span className="text-xl font-semibold text-[#3D3229] dark:text-white">
                Missing Required Skills ({analysis.missingRequired.length})
              </span>
            </div>
            {expanded.missing ? (
              <ChevronUp className="h-6 w-6 text-[#6B5744] dark:text-slate-400" />
            ) : (
              <ChevronDown className="h-6 w-6 text-[#6B5744] dark:text-slate-400" />
            )}
          </button>
          {expanded.missing && (
            <div className="px-6 pb-6">
              <div className="flex flex-wrap gap-3">
                {analysis.missingRequired.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/30 px-4 py-2 text-base font-medium text-red-600 dark:text-red-400"
                  >
                    <XCircle className="h-4 w-4" />
                    {skill}
                  </span>
                ))}
              </div>
              {analysis.missingPreferred.length > 0 && (
                <>
                  <p className="text-base text-[#6B5744] dark:text-slate-400 mt-6 mb-3 font-medium">
                    Nice-to-have skills you&apos;re missing:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {analysis.missingPreferred.map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-[#FAF8F5] dark:bg-slate-800 border border-[#3D3229]/10 dark:border-slate-700 px-4 py-2 text-base text-[#6B5744] dark:text-slate-400"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Matched Skills */}
      {analysis.matchedSkills.length > 0 && (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-900/50 overflow-hidden">
          <button
            onClick={() => setExpanded((e) => ({ ...e, matched: !e.matched }))}
            className="w-full flex items-center justify-between p-6 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-500/10 p-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <span className="text-xl font-semibold text-[#3D3229] dark:text-white">
                Matched Skills ({analysis.matchedSkills.length})
              </span>
            </div>
            {expanded.matched ? (
              <ChevronUp className="h-6 w-6 text-[#6B5744] dark:text-slate-400" />
            ) : (
              <ChevronDown className="h-6 w-6 text-[#6B5744] dark:text-slate-400" />
            )}
          </button>
          {expanded.matched && (
            <div className="px-6 pb-6">
              <div className="flex flex-wrap gap-3">
                {analysis.matchedSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/30 px-4 py-2 text-base font-medium text-green-600 dark:text-green-400"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Skills (Your Unique Value) */}
      {analysis.additionalSkills.length > 0 && (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-900/50 overflow-hidden">
          <button
            onClick={() => setExpanded((e) => ({ ...e, additional: !e.additional }))}
            className="w-full flex items-center justify-between p-6 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-blue-500/10 p-3">
                <Sparkles className="h-6 w-6 text-blue-500" />
              </div>
              <span className="text-xl font-semibold text-[#3D3229] dark:text-white">
                Your Unique Skills ({analysis.additionalSkills.length})
              </span>
            </div>
            {expanded.additional ? (
              <ChevronUp className="h-6 w-6 text-[#6B5744] dark:text-slate-400" />
            ) : (
              <ChevronDown className="h-6 w-6 text-[#6B5744] dark:text-slate-400" />
            )}
          </button>
          {expanded.additional && (
            <div className="px-6 pb-6">
              <p className="text-base text-[#6B5744] dark:text-slate-400 mb-4">
                Skills on your resume that could differentiate you:
              </p>
              <div className="flex flex-wrap gap-3">
                {analysis.additionalSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/30 px-4 py-2 text-base font-medium text-blue-600 dark:text-blue-400"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6">
          <h4 className="text-xl font-semibold text-[#3D3229] dark:text-white mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
            </div>
            Recommendations
          </h4>
          <ul className="space-y-3">
            {analysis.recommendations.map((rec, i) => (
              <li
                key={i}
                className="text-base text-[#6B5744] dark:text-slate-300 pl-5 border-l-2 border-orange-500/50 leading-relaxed"
              >
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
