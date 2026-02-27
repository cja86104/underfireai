import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ShieldAlert,
  TrendingUp,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  FileText,
  BarChart3,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/server';
import { getUserInsights, getLatestVulnerabilityScan } from '@/lib/resume/insights-service';
import type { AlignmentDiscrepancy, AlignmentConfirmation } from '@/lib/resume/alignment-analyzer';
import type { ResumeVulnerability } from '@/lib/resume/vulnerability-scanner';
import type { ResumeSuggestion } from '@/lib/resume/suggestion-generator';
import { cn } from '@/lib/utils/cn';
import { format } from 'date-fns';

export const metadata: Metadata = {
  title: 'Resume Insights',
  description: 'Deep analysis of your resume based on real interview performance.',
};

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 75 ? 'text-green-600 bg-green-50 border-green-200' :
    score >= 50 ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-red-600 bg-red-50 border-red-200';

  return (
    <div className={cn('inline-flex flex-col items-center rounded-xl border px-5 py-3', color)}>
      <span className="text-3xl font-bold">{score}</span>
      <span className="text-sm font-semibold mt-1">{label}</span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  if (severity === 'high') return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
  if (severity === 'medium') return <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />;
  return <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
}

function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-red-50 text-red-600 border-red-200',
    medium: 'bg-amber-50 text-amber-600 border-amber-200',
    low: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium capitalize', styles[severity])}>
      {severity}
    </span>
  );
}

export default async function ResumeInsightsPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Fetch all insight types in parallel
  const [allInsights, latestScan] = await Promise.all([
    getUserInsights(user.id, undefined, 20),
    getLatestVulnerabilityScan(user.id),
  ]);

  const alignmentInsights = allInsights.filter((i) => i.insightType === 'alignment');
  const suggestionInsights = allInsights.filter((i) => i.insightType === 'suggestion');

  // Aggregate and DEDUPLICATE across sessions — group by claim so repeated
  // "missed opportunity" entries from 20 sessions collapse into one row with a count.
  const severityRank = { high: 3, medium: 2, low: 1 } as const;

  // Discrepancies — group by normalized claim
  const discrepancyMap = new Map<string, AlignmentDiscrepancy & { sessionCount: number; latestDate: string }>();
  for (const insight of alignmentInsights) {
    const date = format(new Date(insight.createdAt), 'MMM d');
    for (const d of insight.discrepancies) {
      const key = d.claim.trim().toLowerCase();
      const existing = discrepancyMap.get(key);
      if (!existing) {
        discrepancyMap.set(key, { ...d, sessionCount: 1, latestDate: date });
      } else {
        // Keep highest severity and most recent date; increment count
        const existingRank = severityRank[existing.severity];
        const incomingRank = severityRank[d.severity];
        discrepancyMap.set(key, {
          ...existing,
          severity: incomingRank > existingRank ? d.severity : existing.severity,
          sessionCount: existing.sessionCount + 1,
          latestDate: date, // insights are ordered desc so first seen = most recent
        });
      }
    }
  }
  const groupedDiscrepancies = Array.from(discrepancyMap.values())
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  // Confirmations — group by claim
  const confirmationMap = new Map<string, AlignmentConfirmation & { sessionCount: number; latestDate: string }>();
  for (const insight of alignmentInsights) {
    const date = format(new Date(insight.createdAt), 'MMM d');
    for (const c of insight.confirmations) {
      const key = c.claim.trim().toLowerCase();
      const existing = confirmationMap.get(key);
      if (!existing) {
        confirmationMap.set(key, { ...c, sessionCount: 1, latestDate: date });
      } else {
        confirmationMap.set(key, { ...existing, sessionCount: existing.sessionCount + 1, latestDate: date });
      }
    }
  }
  const groupedConfirmations = Array.from(confirmationMap.values())
    .sort((a, b) => b.sessionCount - a.sessionCount);

  // Suggestions — group by suggestedText (near-identical rewrites collapse)
  const suggestionMap = new Map<string, ResumeSuggestion & { sessionDate: string; sessionCount: number }>();
  const allSuggestionSources = [
    ...alignmentInsights.map((i) => ({ insight: i, suggestions: i.resumeSuggestions })),
    ...suggestionInsights.map((i) => ({ insight: i, suggestions: i.resumeSuggestions })),
  ];
  for (const { insight, suggestions } of allSuggestionSources) {
    const date = format(new Date(insight.createdAt), 'MMM d');
    for (const s of suggestions) {
      const key = (s as ResumeSuggestion).suggestedText.trim().toLowerCase().slice(0, 80);
      const existing = suggestionMap.get(key);
      if (!existing) {
        suggestionMap.set(key, { ...(s as ResumeSuggestion), sessionDate: date, sessionCount: 1 });
      } else {
        suggestionMap.set(key, { ...existing, sessionCount: existing.sessionCount + 1 });
      }
    }
  }
  const groupedSuggestions = Array.from(suggestionMap.values())
    .sort((a, b) => b.sessionCount - a.sessionCount);

  const avgAlignmentScore =
    alignmentInsights.length > 0
      ? Math.round(
          alignmentInsights.reduce((a, b) => a + (b.alignmentScore ?? 0), 0) /
            alignmentInsights.length
        )
      : null;

  const vulnerabilities = (latestScan?.vulnerabilities ?? []) as ResumeVulnerability[];
  const highVulns = vulnerabilities.filter((v) => v.severity === 'high');
  const medVulns = vulnerabilities.filter((v) => v.severity === 'medium');

  const hasAnyData =
    alignmentInsights.length > 0 || latestScan !== null || suggestionInsights.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/resume"
          className="inline-flex items-center gap-1.5 text-sm text-[#3D3229] dark:text-slate-200 hover:text-[#3D3229] dark:hover:text-white transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Resume
        </Link>
        <h1 className="text-2xl font-bold text-[#3D3229] dark:text-white">Resume Insights</h1>
        <p className="text-[#3D3229] dark:text-slate-200 mt-1 text-base">
          Deep analysis of your resume based on real interview performance.
        </p>
      </div>

      {!hasAnyData ? (
        /* No data yet */
        <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center">
          <FileText className="h-12 w-12 text-[#8B7355] dark:text-slate-500 mx-auto mb-4" />
          <h2 className="text-lg text-lg font-bold text-[#3D3229] dark:text-white mb-2">
            No insights yet
          </h2>
          <p className="text-base text-[#3D3229] dark:text-slate-200 max-w-sm mx-auto mb-6">
            Complete interviews to generate alignment analysis, or run a vulnerability
            scan from your resume page to see insights here.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/interview/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#8B5A2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6B4420] transition-colors"
            >
              Start an Interview
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/resume"
              className="inline-flex items-center gap-2 rounded-lg border border-[#3D3229]/15 px-4 py-2 text-sm font-medium text-[#3D3229] hover:bg-[#FAF8F5] transition-colors"
            >
              Go to Resume
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Score Summary Row */}
          <div className="flex flex-wrap gap-4">
            {avgAlignmentScore !== null && (
              <ScoreBadge score={avgAlignmentScore} label="Avg Alignment" />
            )}
            {latestScan?.vulnerabilityScore !== null && latestScan?.vulnerabilityScore !== undefined && (
              <ScoreBadge score={latestScan.vulnerabilityScore} label="Vulnerability Risk" />
            )}
            <div className="inline-flex flex-col items-center rounded-xl border border-[#3D3229]/10 bg-white px-5 py-3">
              <span className="text-3xl font-bold text-[#3D3229]">{alignmentInsights.length}</span>
              <span className="text-sm font-semibold text-[#6B5744] mt-1">Sessions Analyzed</span>
            </div>
            <div className="inline-flex flex-col items-center rounded-xl border border-[#3D3229]/10 bg-white px-5 py-3">
              <span className="text-3xl font-bold text-[#3D3229]">{groupedSuggestions.length}</span>
              <span className="text-sm font-semibold text-[#6B5744] mt-1">Suggestions</span>
            </div>
          </div>

          {/* Vulnerabilities */}
          {vulnerabilities.length > 0 && (
            <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
              <div className="px-5 py-3 border-b border-[#3D3229]/8 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  <h2 className="text-base font-bold text-[#3D3229] dark:text-white">Resume Vulnerabilities</h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#6B5744]">
                  <span className="text-red-700 font-semibold">{highVulns.length} high</span>
                  <span className="text-amber-700 font-semibold">{medVulns.length} medium</span>
                  <span>{latestScan ? format(new Date(latestScan.createdAt), 'MMM d') : ''}</span>
                </div>
              </div>
              <div className="divide-y divide-[#3D3229]/6 dark:divide-slate-800">
                {vulnerabilities.map((vuln, i) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3">
                    <SeverityIcon severity={vuln.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold text-[#3D3229] dark:text-white">{vuln.claim}</p>
                        <SeverityBadge severity={vuln.severity} />
                        <span className="text-xs text-[#6B5744] capitalize">{vuln.category.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-xs text-[#3D3229] dark:text-slate-200 mb-1.5">{vuln.reason}</p>
                      {vuln.probingQuestions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {vuln.probingQuestions.map((q, qi) => (
                            <span key={qi} className="text-xs bg-[#FAF8F5] border border-[#3D3229]/10 rounded px-2 py-0.5 text-[#3D3229] dark:text-slate-200">
                              {q}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-start gap-1.5 rounded bg-green-50 dark:bg-green-900/10 border border-green-200 px-2.5 py-1.5">
                        <span className="text-xs font-semibold text-green-700 flex-shrink-0">Fix:</span>
                        <span className="text-xs text-green-900 dark:text-green-300">{vuln.suggestedFix}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interview Alignment */}
          {(groupedDiscrepancies.length > 0 || groupedConfirmations.length > 0) && (
            <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
              <div className="px-5 py-3 border-b border-[#3D3229]/8 dark:border-slate-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#8B5A2B]" />
                <h2 className="text-base font-bold text-[#3D3229] dark:text-white">Resume vs. Interview Performance</h2>
              </div>

              {/* Discrepancies */}
              {groupedDiscrepancies.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-red-50/50 dark:bg-red-900/10 border-b border-[#3D3229]/6">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                      {groupedDiscrepancies.length} unique discrepanc{groupedDiscrepancies.length === 1 ? 'y' : 'ies'} across {alignmentInsights.length} sessions
                    </p>
                  </div>
                  <div className="divide-y divide-[#3D3229]/6 dark:divide-slate-800">
                    {groupedDiscrepancies.map((d, i) => (
                      <div key={i} className="px-5 py-3 flex items-start gap-3">
                        <SeverityIcon severity={d.severity} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-sm font-semibold text-[#3D3229] dark:text-white">{d.claim}</p>
                            <SeverityBadge severity={d.severity} />
                            {d.sessionCount > 1 && (
                              <span className="text-xs bg-[#3D3229]/8 text-[#6B5744] px-2 py-0.5 rounded-full font-medium">
                                {d.sessionCount}× sessions
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#3D3229] dark:text-slate-200">{d.evidence}</p>
                          <p className="text-xs font-medium text-[#8B5A2B] dark:text-orange-400 mt-0.5">{d.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmations */}
              {groupedConfirmations.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-green-50/50 dark:bg-green-900/10 border-t border-b border-[#3D3229]/6">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                      {groupedConfirmations.length} unique claim{groupedConfirmations.length === 1 ? '' : 's'} confirmed by your performance
                    </p>
                  </div>
                  <div className="divide-y divide-[#3D3229]/6 dark:divide-slate-800">
                    {groupedConfirmations.map((c, i) => (
                      <div key={i} className="px-5 py-3 flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-sm font-semibold text-[#3D3229] dark:text-white">{c.claim}</p>
                            {c.sessionCount > 1 && (
                              <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                                {c.sessionCount}× confirmed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#3D3229] dark:text-slate-200 mt-0.5">{c.evidence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggestions */}
          {groupedSuggestions.length > 0 && (
            <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
              <div className="px-5 py-3 border-b border-[#3D3229]/8 dark:border-slate-800 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-bold text-[#3D3229] dark:text-white">Resume Improvement Suggestions</h2>
              </div>
              <div className="divide-y divide-[#3D3229]/6 dark:divide-slate-800">
                {groupedSuggestions.map((s, i) => {
                  const typeColor = {
                    add: 'bg-green-50 text-green-700 border-green-200',
                    modify: 'bg-amber-50 text-amber-700 border-amber-200',
                    remove: 'bg-red-50 text-red-700 border-red-200',
                    reorder: 'bg-blue-50 text-blue-700 border-blue-200',
                  }[s.type] ?? 'bg-[#FAF8F5] text-[#6B5744] border-[#3D3229]/15';

                  return (
                    <div key={i} className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium capitalize', typeColor)}>
                          {s.type}
                        </span>
                        {'priority' in s && (
                          <SeverityBadge severity={(s as ResumeSuggestion).priority as 'high' | 'medium' | 'low'} />
                        )}
                        {'section' in s && (
                          <span className="text-xs text-[#6B5744] capitalize">
                            {((s as ResumeSuggestion).section ?? '').replace(/_/g, ' ')}
                          </span>
                        )}
                        {s.sessionCount > 1 && (
                          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            {s.sessionCount}× sessions
                          </span>
                        )}
                      </div>
                      {s.currentText && (
                        <p className="text-xs text-[#3D3229] dark:text-slate-200 line-clamp-1 mb-1">
                          <span className="font-medium text-[#6B5744]">Current: </span>{s.currentText}
                        </p>
                      )}
                      <p className="text-xs text-green-900 dark:text-green-300 bg-green-50 dark:bg-green-900/10 border border-green-200 rounded px-2.5 py-1.5 mb-1">
                        <span className="font-semibold text-green-700">Suggested: </span>{s.suggestedText}
                      </p>
                      <p className="text-xs text-[#3D3229] dark:text-slate-200">{s.reason}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alignment trend by session */}
          {alignmentInsights.length > 1 && (
            <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-[#8B5A2B]" />
                <h2 className="text-base font-bold text-[#3D3229] dark:text-white">Alignment by Session</h2>
              </div>
              <div className="space-y-3">
                {alignmentInsights.slice(0, 8).reverse().map((insight) => (
                  <div key={insight.id} className="flex items-center gap-3">
                    <span className="text-sm text-[#6B5744] w-16 flex-shrink-0">
                      {format(new Date(insight.createdAt), 'MMM d')}
                    </span>
                    <div className="flex-1 h-2 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#3D3229]/8">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          (insight.alignmentScore ?? 0) >= 75 ? 'bg-green-500' :
                          (insight.alignmentScore ?? 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        )}
                        style={{ width: `${insight.alignmentScore ?? 0}%` }}
                      />
                    </div>
                    <span className="text-base font-bold text-[#3D3229] w-12 text-right">
                      {insight.alignmentScore ?? 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
