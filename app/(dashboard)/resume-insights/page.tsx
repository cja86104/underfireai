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
import type { ResumeInsight } from '@/lib/resume/insights-service';
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

  // Aggregate all discrepancies, confirmations, and suggestions across sessions
  const allDiscrepancies: (AlignmentDiscrepancy & { sessionDate: string })[] = [];
  const allConfirmations: (AlignmentConfirmation & { sessionDate: string })[] = [];
  const allSuggestions: (ResumeSuggestion & { sessionDate: string })[] = [];

  for (const insight of alignmentInsights) {
    const date = format(new Date(insight.createdAt), 'MMM d');
    for (const d of insight.discrepancies) {
      allDiscrepancies.push({ ...d, sessionDate: date });
    }
    for (const c of insight.confirmations) {
      allConfirmations.push({ ...c, sessionDate: date });
    }
    for (const s of insight.resumeSuggestions) {
      allSuggestions.push({ ...(s as ResumeSuggestion), sessionDate: date });
    }
  }

  for (const insight of suggestionInsights) {
    const date = format(new Date(insight.createdAt), 'MMM d');
    for (const s of insight.resumeSuggestions) {
      allSuggestions.push({ ...(s as ResumeSuggestion), sessionDate: date });
    }
  }

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
          className="inline-flex items-center gap-1.5 text-sm text-[#3D3229]/60 dark:text-slate-400 hover:text-[#3D3229] dark:hover:text-white transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Resume
        </Link>
        <h1 className="text-2xl font-bold text-[#3D3229] dark:text-white">Resume Insights</h1>
        <p className="text-[#3D3229]/70 dark:text-slate-400 mt-1 text-base">
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
          <p className="text-base text-[#3D3229]/80 dark:text-slate-400 max-w-sm mx-auto mb-6">
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
              <span className="text-3xl font-bold text-[#3D3229]">{allSuggestions.length}</span>
              <span className="text-sm font-semibold text-[#6B5744] mt-1">Suggestions</span>
            </div>
          </div>

          {/* Vulnerabilities */}
          {vulnerabilities.length > 0 && (
            <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
              <div className="p-5 border-b border-[#3D3229]/8 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-6 w-6 text-red-500" />
                  <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">
                    Resume Vulnerabilities
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#6B5744]">
                  <span className="text-red-700 font-semibold text-sm">{highVulns.length} high</span>
                  <span className="text-amber-700 font-semibold text-sm">{medVulns.length} medium</span>
                  <span>{latestScan ? format(new Date(latestScan.createdAt), 'MMM d') : ''}</span>
                </div>
              </div>
              <div className="divide-y divide-[#3D3229]/6 dark:divide-slate-800">
                {vulnerabilities.map((vuln, i) => (
                  <div key={i} className="p-5">
                    <div className="flex items-start gap-3">
                      <SeverityIcon severity={vuln.severity} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-[#3D3229] dark:text-white text-base">
                            {vuln.claim}
                          </p>
                          <SeverityBadge severity={vuln.severity} />
                          <span className="text-sm text-[#6B5744] font-medium capitalize">
                            {vuln.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-base text-[#3D3229]/80 dark:text-slate-400 mb-3">
                          {vuln.reason}
                        </p>
                        {vuln.probingQuestions.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-[#3D3229] mb-2">
                              Questions you'll likely face:
                            </p>
                            <ul className="space-y-1">
                              {vuln.probingQuestions.map((q, qi) => (
                                <li key={qi} className="text-base text-[#3D3229]/80 dark:text-slate-400 pl-3 border-l-2 border-[#3D3229]/15">
                                  {q}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 px-3 py-2">
                          <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">Suggested fix</p>
                          <p className="text-base text-green-900 dark:text-green-300">{vuln.suggestedFix}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interview Alignment */}
          {(allDiscrepancies.length > 0 || allConfirmations.length > 0) && (
            <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
              <div className="p-5 border-b border-[#3D3229]/8 dark:border-slate-800 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-[#8B5A2B]" />
                <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">
                  Resume vs. Interview Performance
                </h2>
              </div>

              {/* Discrepancies */}
              {allDiscrepancies.length > 0 && (
                <div>
                  <div className="px-5 py-3 bg-red-50/50 dark:bg-red-900/10 border-b border-[#3D3229]/6">
                    <p className="text-base font-semibold text-red-700 dark:text-red-400">
                      {allDiscrepancies.length} discrepanc{allDiscrepancies.length === 1 ? 'y' : 'ies'} found — claims your performance didn't back up
                    </p>
                  </div>
                  <div className="divide-y divide-[#3D3229]/6 dark:divide-slate-800">
                    {allDiscrepancies.map((d, i) => (
                      <div key={i} className="p-5">
                        <div className="flex items-start gap-3">
                          <SeverityIcon severity={d.severity} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-[#3D3229] dark:text-white text-base">{d.claim}</p>
                              <SeverityBadge severity={d.severity} />
                              <span className="text-sm text-[#6B5744]">{d.sessionDate}</span>
                            </div>
                            <p className="text-base text-[#3D3229]/80 dark:text-slate-400 mb-2">{d.evidence}</p>
                            <p className="text-base font-medium text-[#8B5A2B] dark:text-orange-400">{d.suggestion}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmations */}
              {allConfirmations.length > 0 && (
                <div>
                  <div className="px-5 py-3 bg-green-50/50 dark:bg-green-900/10 border-t border-b border-[#3D3229]/6">
                    <p className="text-base font-semibold text-green-700 dark:text-green-400">
                      {allConfirmations.length} claim{allConfirmations.length === 1 ? '' : 's'} confirmed by your performance
                    </p>
                  </div>
                  <div className="divide-y divide-[#3D3229]/6 dark:divide-slate-800">
                    {allConfirmations.map((c, i) => (
                      <div key={i} className="p-5 flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[#3D3229] dark:text-white text-base">{c.claim}</p>
                          <p className="text-base text-[#3D3229]/80 dark:text-slate-400 mt-0.5">{c.evidence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggestions */}
          {allSuggestions.length > 0 && (
            <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
              <div className="p-5 border-b border-[#3D3229]/8 dark:border-slate-800 flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-amber-500" />
                <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">
                  Resume Improvement Suggestions
                </h2>
              </div>
              <div className="divide-y divide-[#3D3229]/6 dark:divide-slate-800">
                {allSuggestions.map((s, i) => {
                  const typeColor = {
                    add: 'bg-green-50 text-green-700 border-green-200',
                    modify: 'bg-amber-50 text-amber-700 border-amber-200',
                    remove: 'bg-red-50 text-red-700 border-red-200',
                    reorder: 'bg-blue-50 text-blue-700 border-blue-200',
                  }[s.type] ?? 'bg-[#FAF8F5] text-[#6B5744] border-[#3D3229]/15';

                  return (
                    <div key={i} className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium capitalize', typeColor)}>
                          {s.type}
                        </span>
                        {'priority' in s && (
                          <SeverityBadge severity={(s as ResumeSuggestion).priority as 'high' | 'medium' | 'low'} />
                        )}
                        {'section' in s && (
                          <span className="text-sm text-[#6B5744] font-medium capitalize">
                            {((s as ResumeSuggestion).section ?? '').replace(/_/g, ' ')}
                          </span>
                        )}
                        <span className="text-sm text-[#6B5744]">{s.sessionDate}</span>
                      </div>
                      {s.currentText && (
                        <div className="mb-2 rounded-lg bg-[#FAF8F5] px-3 py-2 border border-[#3D3229]/8">
                          <p className="text-sm font-semibold text-[#6B5744] mb-1">Current</p>
                          <p className="text-base text-[#3D3229]/80 line-clamp-2">{s.currentText}</p>
                        </div>
                      )}
                      <div className="rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 px-3 py-2 mb-2">
                        <p className="text-sm font-semibold text-green-700 mb-1">Suggested</p>
                        <p className="text-base text-green-900">{s.suggestedText}</p>
                      </div>
                      <p className="text-base text-[#3D3229]/80 dark:text-slate-400">{s.reason}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alignment trend by session */}
          {alignmentInsights.length > 1 && (
            <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-6 w-6 text-[#8B5A2B]" />
                <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Alignment by Session</h2>
              </div>
              <div className="space-y-3">
                {alignmentInsights.slice(0, 8).reverse().map((insight, i) => (
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
