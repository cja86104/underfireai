import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
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
  Zap,
  AlertCircle,
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

function ScoreRing({ score, label, color }: { score: number; label: string; color: 'green' | 'amber' | 'red' | 'blue' }) {
  const colors = {
    green: { ring: 'stroke-green-500', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400' },
    amber: { ring: 'stroke-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' },
    red: { ring: 'stroke-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' },
    blue: { ring: 'stroke-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
  };
  const c = colors[color];
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 rounded-2xl', c.bg)}>
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="10" fill="none" className="text-gray-200 dark:text-gray-700" />
          <circle cx="64" cy="64" r="54" strokeWidth="10" fill="none" strokeLinecap="round"
            className={c.ring} strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-4xl font-bold', c.text)}>{score}</span>
        </div>
      </div>
      <span className={cn('text-lg font-semibold mt-4', c.text)}>{label}</span>
    </div>
  );
}

function StatCard({ value, label, icon: Icon }: { value: number | string; label: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-5 p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-[#3D3229]/10 dark:border-slate-800">
      <div className="p-4 rounded-xl bg-[#FAF8F5] dark:bg-slate-800">
        <Icon className="h-10 w-10 text-[#8B5A2B]" />
      </div>
      <div>
        <p className="text-5xl font-bold text-[#3D3229] dark:text-white">{value}</p>
        <p className="text-lg text-[#3D3229] dark:text-slate-200">{label}</p>
      </div>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  if (severity === 'high') return <XCircle className="h-8 w-8 text-red-500 flex-shrink-0" />;
  if (severity === 'medium') return <AlertTriangle className="h-8 w-8 text-amber-500 flex-shrink-0" />;
  return <AlertCircle className="h-8 w-8 text-yellow-500 flex-shrink-0" />;
}

function SeverityBadge({ severity, size = 'md' }: { severity: 'high' | 'medium' | 'low'; size?: 'sm' | 'md' }) {
  const styles = {
    high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    low: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  };
  const sizeClass = size === 'sm' ? 'text-base px-3 py-1' : 'text-lg px-4 py-1.5';
  return (
    <span className={cn('rounded-full border font-medium capitalize', styles[severity], sizeClass)}>
      {severity}
    </span>
  );
}

export default async function ResumeInsightsPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [allInsights, latestScan] = await Promise.all([
    getUserInsights(user.id, undefined, 20),
    getLatestVulnerabilityScan(user.id),
  ]);

  const alignmentInsights = allInsights.filter((i) => i.insightType === 'alignment');
  const suggestionInsights = allInsights.filter((i) => i.insightType === 'suggestion');

  const severityRank = { high: 3, medium: 2, low: 1 } as const;

  // Discrepancies
  const discrepancyMap = new Map<string, AlignmentDiscrepancy & { sessionCount: number; latestDate: string }>();
  for (const insight of alignmentInsights) {
    const date = format(new Date(insight.createdAt), 'MMM d');
    for (const d of insight.discrepancies) {
      const key = d.claim.trim().toLowerCase();
      const existing = discrepancyMap.get(key);
      if (!existing) {
        discrepancyMap.set(key, { ...d, sessionCount: 1, latestDate: date });
      } else {
        const existingRank = severityRank[existing.severity];
        const incomingRank = severityRank[d.severity];
        discrepancyMap.set(key, {
          ...existing,
          severity: incomingRank > existingRank ? d.severity : existing.severity,
          sessionCount: existing.sessionCount + 1,
          latestDate: date,
        });
      }
    }
  }
  const groupedDiscrepancies = Array.from(discrepancyMap.values())
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  // Confirmations
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

  // Suggestions
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
      ? Math.round(alignmentInsights.reduce((a, b) => a + (b.alignmentScore ?? 0), 0) / alignmentInsights.length)
      : null;

  const vulnerabilities = (latestScan?.vulnerabilities ?? []) as ResumeVulnerability[];
  const highVulns = vulnerabilities.filter((v) => v.severity === 'high');
  const medVulns = vulnerabilities.filter((v) => v.severity === 'medium');

  const hasAnyData = alignmentInsights.length > 0 || latestScan !== null || suggestionInsights.length > 0;

  const getScoreColor = (score: number): 'green' | 'amber' | 'red' => {
    if (score >= 75) return 'green';
    if (score >= 50) return 'amber';
    return 'red';
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <Link
          href="/resume"
          className="inline-flex items-center gap-2 text-lg text-[#3D3229] dark:text-slate-200 hover:text-[#3D3229] dark:hover:text-white transition-colors mb-5"
        >
          <ChevronLeft className="h-6 w-6" />
          Back to Resume
        </Link>
        <h1 className="text-5xl lg:text-6xl font-bold text-[#3D3229] dark:text-white">Resume Insights</h1>
        <p className="text-2xl text-[#3D3229] dark:text-slate-200 mt-3">
          Deep analysis of your resume based on real interview performance
        </p>
      </div>

      {!hasAnyData ? (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-20 text-center max-w-3xl mx-auto">
          <FileText className="h-24 w-24 text-[#8B7355] dark:text-slate-500 mx-auto mb-8" />
          <h2 className="text-4xl font-bold text-[#3D3229] dark:text-white mb-4">No insights yet</h2>
          <p className="text-2xl text-[#3D3229] dark:text-slate-200 max-w-lg mx-auto mb-10">
            Complete interviews to generate alignment analysis, or run a vulnerability scan from your resume page.
          </p>
          <div className="flex items-center justify-center gap-5">
            <Link
              href="/interview/new"
              className="inline-flex items-center gap-3 rounded-xl bg-[#8B5A2B] px-8 py-4 text-xl font-semibold text-white hover:bg-[#6B4420] transition-colors"
            >
              Start an Interview
              <ArrowRight className="h-6 w-6" />
            </Link>
            <Link
              href="/resume"
              className="inline-flex items-center gap-3 rounded-xl border-2 border-[#3D3229]/20 px-8 py-4 text-xl font-medium text-[#3D3229] hover:bg-[#FAF8F5] transition-colors"
            >
              Go to Resume
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Score Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8">
            {avgAlignmentScore !== null && (
              <ScoreRing score={avgAlignmentScore} label="Avg Alignment" color={getScoreColor(avgAlignmentScore)} />
            )}
            {latestScan?.vulnerabilityScore !== null && latestScan?.vulnerabilityScore !== undefined && (
              <ScoreRing 
                score={latestScan.vulnerabilityScore} 
                label="Vulnerability Risk" 
                color={getScoreColor(100 - latestScan.vulnerabilityScore)} 
              />
            )}
            <StatCard value={alignmentInsights.length} label="Sessions Analyzed" icon={BarChart3} />
            <StatCard value={groupedSuggestions.length} label="Suggestions" icon={Lightbulb} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* Vulnerabilities Panel */}
            {vulnerabilities.length > 0 && (
              <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden xl:col-span-2">
                <div className="px-8 py-6 border-b border-[#3D3229]/10 dark:border-slate-800 bg-red-50/50 dark:bg-red-900/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                        <ShieldAlert className="h-10 w-10 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-[#3D3229] dark:text-white">Resume Vulnerabilities</h2>
                        <p className="text-lg text-[#3D3229] dark:text-slate-200">
                          Areas interviewers might probe or challenge
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-red-600">{highVulns.length}</p>
                        <p className="text-base text-red-600 font-medium">High</p>
                      </div>
                      <div className="text-center">
                        <p className="text-4xl font-bold text-amber-600">{medVulns.length}</p>
                        <p className="text-base text-amber-600 font-medium">Medium</p>
                      </div>
                      {latestScan && (
                        <p className="text-lg text-[#3D3229] dark:text-slate-200">
                          Scanned {format(new Date(latestScan.createdAt), 'MMM d')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#3D3229]/10 dark:bg-slate-800">
                  {vulnerabilities.map((vuln, i) => (
                    <div key={i} className="p-8 bg-white dark:bg-slate-900/50">
                      <div className="flex items-start gap-5">
                        <SeverityIcon severity={vuln.severity} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4 flex-wrap mb-3">
                            <h3 className="text-xl font-semibold text-[#3D3229] dark:text-white">{vuln.claim}</h3>
                            <SeverityBadge severity={vuln.severity} size="sm" />
                          </div>
                          <p className="text-lg text-[#3D3229] dark:text-slate-200 mb-4">{vuln.reason}</p>
                          {vuln.probingQuestions.length > 0 && (
                            <div className="mb-4">
                              <p className="text-base font-semibold text-[#3D3229] dark:text-slate-200 mb-3 uppercase tracking-wide">
                                Likely Questions
                              </p>
                              <div className="space-y-2">
                                {vuln.probingQuestions.slice(0, 2).map((q, qi) => (
                                  <p key={qi} className="text-lg text-[#3D3229] dark:text-slate-200 pl-4 border-l-4 border-amber-300">
                                    {q}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                            <Zap className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <p className="text-lg text-green-800 dark:text-green-300">{vuln.suggestedFix}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discrepancies Panel */}
            {groupedDiscrepancies.length > 0 && (
              <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
                <div className="px-8 py-6 border-b border-[#3D3229]/10 dark:border-slate-800 bg-red-50/30 dark:bg-red-900/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Resume Gaps</h2>
                      <p className="text-lg text-[#3D3229] dark:text-slate-200">
                        {groupedDiscrepancies.length} discrepancies found in {alignmentInsights.length} sessions
                      </p>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-[#3D3229]/10 dark:divide-slate-800 max-h-[600px] overflow-y-auto" data-lenis-prevent>
                  {groupedDiscrepancies.map((d, i) => (
                    <div key={i} className="p-6 hover:bg-[#FAF8F5]/50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start gap-5">
                        <SeverityIcon severity={d.severity} />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-3">
                            <h3 className="text-xl font-semibold text-[#3D3229] dark:text-white">{d.claim}</h3>
                            <SeverityBadge severity={d.severity} size="sm" />
                            {d.sessionCount > 1 && (
                              <span className="text-base bg-[#3D3229]/10 text-[#3D3229] px-3 py-1.5 rounded-full font-medium">
                                {d.sessionCount}× sessions
                              </span>
                            )}
                          </div>
                          <p className="text-lg text-[#3D3229] dark:text-slate-200 mb-3">{d.evidence}</p>
                          <p className="text-lg font-medium text-[#8B5A2B] dark:text-orange-400">
                            💡 {d.suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmations Panel */}
            {groupedConfirmations.length > 0 && (
              <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
                <div className="px-8 py-6 border-b border-[#3D3229]/10 dark:border-slate-800 bg-green-50/30 dark:bg-green-900/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Verified Strengths</h2>
                      <p className="text-lg text-[#3D3229] dark:text-slate-200">
                        {groupedConfirmations.length} claims confirmed by your performance
                      </p>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-[#3D3229]/10 dark:divide-slate-800 max-h-[600px] overflow-y-auto" data-lenis-prevent>
                  {groupedConfirmations.map((c, i) => (
                    <div key={i} className="p-6 hover:bg-green-50/30 dark:hover:bg-green-900/10 transition-colors">
                      <div className="flex items-start gap-5">
                        <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-3">
                            <h3 className="text-xl font-semibold text-[#3D3229] dark:text-white">{c.claim}</h3>
                            {c.sessionCount > 1 && (
                              <span className="text-base bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-full font-medium">
                                ✓ {c.sessionCount}× confirmed
                              </span>
                            )}
                          </div>
                          <p className="text-lg text-[#3D3229] dark:text-slate-200">{c.evidence}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Suggestions Section - Full Width */}
          {groupedSuggestions.length > 0 && (
            <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
              <div className="px-8 py-6 border-b border-[#3D3229]/10 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-900/10">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Lightbulb className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Resume Improvements</h2>
                    <p className="text-lg text-[#3D3229] dark:text-slate-200">
                      AI-powered suggestions based on your interview performance
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-px bg-[#3D3229]/10 dark:bg-slate-800">
                {groupedSuggestions.map((s, i) => {
                  const typeStyles = {
                    add: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
                    modify: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
                    remove: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
                    reorder: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
                  };
                  const style = typeStyles[s.type] ?? { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };

                  return (
                    <div key={i} className="p-6 bg-white dark:bg-slate-900/50">
                      <div className="flex items-center gap-3 flex-wrap mb-4">
                        <span className={cn('text-base px-4 py-1.5 rounded-full border font-semibold uppercase tracking-wide', style.bg, style.text, style.border)}>
                          {s.type}
                        </span>
                        {'priority' in s && (
                          <SeverityBadge severity={(s as ResumeSuggestion).priority as 'high' | 'medium' | 'low'} size="sm" />
                        )}
                        {s.sessionCount > 1 && (
                          <span className="text-base bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-full font-medium">
                            {s.sessionCount}× suggested
                          </span>
                        )}
                      </div>
                      
                      {'section' in s && (s as ResumeSuggestion).section && (
                        <p className="text-base text-[#3D3229] dark:text-slate-200 uppercase tracking-wide mb-3 font-medium">
                          📍 {((s as ResumeSuggestion).section ?? '').replace(/_/g, ' ')}
                        </p>
                      )}
                      
                      {s.currentText && (
                        <div className="mb-4 p-4 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                          <p className="text-base font-semibold text-red-600 dark:text-red-400 mb-2">CURRENT</p>
                          <p className="text-lg text-[#3D3229] dark:text-slate-200 line-clamp-2">{s.currentText}</p>
                        </div>
                      )}
                      
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mb-4">
                        <p className="text-base font-semibold text-green-600 dark:text-green-400 mb-2">SUGGESTED</p>
                        <p className="text-lg text-green-900 dark:text-green-200">{s.suggestedText}</p>
                      </div>
                      
                      <p className="text-lg text-[#3D3229] dark:text-slate-200">{s.reason}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alignment Trend */}
          {alignmentInsights.length > 1 && (
            <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-lg bg-[#FAF8F5] dark:bg-slate-800">
                  <TrendingUp className="h-8 w-8 text-[#8B5A2B]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Alignment Trend</h2>
                  <p className="text-lg text-[#3D3229] dark:text-slate-200">Your resume-to-interview alignment over time</p>
                </div>
              </div>
              <div className="space-y-5">
                {alignmentInsights.slice(0, 8).reverse().map((insight) => (
                  <div key={insight.id} className="flex items-center gap-5">
                    <span className="text-lg font-medium text-[#3D3229] dark:text-slate-200 w-24 flex-shrink-0">
                      {format(new Date(insight.createdAt), 'MMM d')}
                    </span>
                    <div className="flex-1 h-6 bg-[#FAF8F5] dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          (insight.alignmentScore ?? 0) >= 75 ? 'bg-green-500' :
                          (insight.alignmentScore ?? 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        )}
                        style={{ width: `${insight.alignmentScore ?? 0}%` }}
                      />
                    </div>
                    <span className={cn(
                      'text-2xl font-bold w-20 text-right',
                      (insight.alignmentScore ?? 0) >= 75 ? 'text-green-600' :
                      (insight.alignmentScore ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600'
                    )}>
                      {insight.alignmentScore ?? 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
