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
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-amber-400';
    return 'text-red-400';
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="text-center py-8">
          <Target className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Ready to Analyze
          </h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Compare this job description against your resume to identify skill
            gaps and get targeted practice recommendations.
          </p>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors',
              'bg-orange-500 text-white hover:bg-orange-600',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Run Gap Analysis
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Match Score Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {jd.roleTitle ?? 'Job'} at {jd.companyName ?? 'Company'}
            </h3>
            <p className="text-sm text-slate-400">Gap Analysis Results</p>
          </div>
          <div className="text-right">
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
                  strokeDasharray={`${analysis.matchPercentage} 100`}
                  className={getMatchBgColor(analysis.matchPercentage)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={cn(
                    'text-lg font-bold',
                    getMatchColor(analysis.matchPercentage)
                  )}
                >
                  {analysis.matchPercentage}%
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">Match</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-lg bg-green-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-green-400">
              {analysis.matchedSkills.length}
            </p>
            <p className="text-xs text-slate-400">Matched</p>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-red-400">
              {analysis.missingRequired.length}
            </p>
            <p className="text-xs text-slate-400">Missing (Required)</p>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {analysis.additionalSkills.length}
            </p>
            <p className="text-xs text-slate-400">Unique to You</p>
          </div>
        </div>

        {/* Practice Button */}
        {practiceUrl ? (
          <Link
            href={practiceUrl}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            <Play className="h-4 w-4" />
            Start Targeted Practice
          </Link>
        ) : (
          <button
            onClick={handleGeneratePractice}
            disabled={generatingPractice}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {generatingPractice ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Practice Interview
              </>
            )}
          </button>
        )}
      </div>

      {/* Narrative Gaps */}
      {analysis.narrativeGaps.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <button
            onClick={() =>
              setExpanded((e) => ({ ...e, narrative: !e.narrative }))
            }
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <span className="font-medium text-white">
                Experience Gaps ({analysis.narrativeGaps.length})
              </span>
            </div>
            {expanded.narrative ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {expanded.narrative && (
            <div className="px-4 pb-4 space-y-3">
              {analysis.narrativeGaps.map((gap, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg border p-4',
                    gap.severity === 'critical'
                      ? 'border-red-500/30 bg-red-500/10'
                      : gap.severity === 'moderate'
                      ? 'border-amber-500/30 bg-amber-500/10'
                      : 'border-blue-500/30 bg-blue-500/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-white text-sm">{gap.area}</p>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full capitalize',
                        gap.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : gap.severity === 'moderate'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/20 text-blue-400'
                      )}
                    >
                      {gap.severity}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">
                    {gap.gapDescription}
                  </p>
                  <div className="flex items-start gap-1.5 text-xs text-slate-400">
                    <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    {gap.coachingTip}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Missing Required Skills */}
      {analysis.missingRequired.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <button
            onClick={() => setExpanded((e) => ({ ...e, missing: !e.missing }))}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-400" />
              <span className="font-medium text-white">
                Missing Required Skills ({analysis.missingRequired.length})
              </span>
            </div>
            {expanded.missing ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {expanded.missing && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {analysis.missingRequired.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1 text-sm text-red-400"
                  >
                    <XCircle className="h-3 w-3" />
                    {skill}
                  </span>
                ))}
              </div>
              {analysis.missingPreferred.length > 0 && (
                <>
                  <p className="text-xs text-slate-500 mt-4 mb-2">
                    Nice-to-have skills you&apos;re missing:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.missingPreferred.map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-400"
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
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <button
            onClick={() => setExpanded((e) => ({ ...e, matched: !e.matched }))}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="font-medium text-white">
                Matched Skills ({analysis.matchedSkills.length})
              </span>
            </div>
            {expanded.matched ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {expanded.matched && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {analysis.matchedSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/30 px-3 py-1 text-sm text-green-400"
                  >
                    <CheckCircle className="h-3 w-3" />
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
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <button
            onClick={() =>
              setExpanded((e) => ({ ...e, additional: !e.additional }))
            }
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-blue-400" />
              <span className="font-medium text-white">
                Your Unique Skills ({analysis.additionalSkills.length})
              </span>
            </div>
            {expanded.additional ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {expanded.additional && (
            <div className="px-4 pb-4">
              <p className="text-xs text-slate-400 mb-3">
                Skills on your resume that could differentiate you:
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.additionalSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-1 text-sm text-blue-400"
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
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Recommendations
          </h4>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, i) => (
              <li
                key={i}
                className="text-sm text-slate-300 pl-4 border-l-2 border-slate-700"
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
