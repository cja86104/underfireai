'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  Trash2,
  ChevronRight,
  Loader2,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { JobDescriptionAnalyzer, GapResults } from '@/components/job-description';
import { cn } from '@/lib/utils/cn';

// ===========================================
// TYPES
// ===========================================

interface SavedJD {
  id: string;
  companyName: string | null;
  roleTitle: string | null;
  requiredSkillsCount: number;
  matchPercentage: number | null;
  createdAt: string;
  analyzed: boolean;
}

interface GapAnalysis {
  matchPercentage: number;
  matchedSkills: string[];
  missingRequired: string[];
  missingPreferred: string[];
  additionalSkills: string[];
  narrativeGaps: {
    area: string;
    gapDescription: string;
    coachingTip: string;
    severity: 'critical' | 'moderate' | 'minor';
  }[];
  strengths: string[];
  recommendations: string[];
}

// ===========================================
// PAGE COMPONENT
// ===========================================

export function JobAnalysisClient(): React.JSX.Element {
  const [savedJobs, setSavedJobs] = useState<SavedJD[]>([]);
  const [selectedJd, setSelectedJd] = useState<SavedJD | null>(null);
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedJobs = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/job-description');
      if (!response.ok) {
        throw new Error('Failed to fetch job descriptions');
      }
      const data = (await response.json()) as { jobDescriptions: SavedJD[] };
      setSavedJobs(data.jobDescriptions);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSavedJobs();
  }, [fetchSavedJobs]);

  const handleAnalyzed = (jd: {
    id: string;
    companyName: string | null;
    roleTitle: string | null;
    requiredSkills: string[];
  }): void => {
    // Add to list and select it
    const newJd: SavedJD = {
      id: jd.id,
      companyName: jd.companyName,
      roleTitle: jd.roleTitle,
      requiredSkillsCount: jd.requiredSkills.length,
      matchPercentage: null,
      createdAt: new Date().toISOString(),
      analyzed: false,
    };
    setSavedJobs((prev) => [newJd, ...prev]);
    setSelectedJd(newJd);
    setAnalysis(null);
  };

  const handleSelectJd = async (jd: SavedJD): Promise<void> => {
    setSelectedJd(jd);
    setAnalysis(null);
    setError(null);

    // If already analyzed, fetch the analysis
    if (jd.analyzed) {
      try {
        const response = await fetch(`/api/job-description/${jd.id}`);
        if (response.ok) {
          const data = (await response.json()) as {
            jobDescription: {
              matchPercentage: number;
              matchedSkills: string[];
              missingRequired: string[];
              missingPreferred: string[];
              additionalSkills: string[];
              narrativeGaps: GapAnalysis['narrativeGaps'];
            };
          };
          setAnalysis({
            matchPercentage: data.jobDescription.matchPercentage,
            matchedSkills: data.jobDescription.matchedSkills,
            missingRequired: data.jobDescription.missingRequired,
            missingPreferred: data.jobDescription.missingPreferred,
            additionalSkills: data.jobDescription.additionalSkills,
            narrativeGaps: data.jobDescription.narrativeGaps,
            strengths: [],
            recommendations: [],
          });
        }
      } catch (err) {
        console.error('Fetch analysis error:', err);
      }
    }
  };

  const handleRunAnalysis = async (): Promise<void> => {
    if (!selectedJd) return;

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/job-description/${selectedJd.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? 'Failed to analyze');
      }

      const data = (await response.json()) as { analysis: GapAnalysis };
      setAnalysis(data.analysis);

      // Update the saved job
      setSavedJobs((prev) =>
        prev.map((j) =>
          j.id === selectedJd.id
            ? { ...j, analyzed: true, matchPercentage: data.analysis.matchPercentage }
            : j
        )
      );
      setSelectedJd((prev) =>
        prev ? { ...prev, analyzed: true, matchPercentage: data.analysis.matchPercentage } : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await fetch(`/api/job-description/${id}`, { method: 'DELETE' });
      setSavedJobs((prev) => prev.filter((j) => j.id !== id));
      if (selectedJd?.id === id) {
        setSelectedJd(null);
        setAnalysis(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#3D3229] dark:text-white">Job Description Analysis</h1>
        <p className="text-lg text-[#6B5744] dark:text-slate-400 mt-2">
          Analyze job descriptions to identify skill gaps and get targeted practice
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Input & List */}
        <div className="space-y-6">
          {/* Analyzer Input */}
          <JobDescriptionAnalyzer onAnalyzed={handleAnalyzed} />

          {/* Saved JDs */}
          <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-900/50">
            <div className="p-5 border-b border-[#3D3229]/10 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-[#3D3229] dark:text-white">Saved Job Descriptions</h3>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#6B5744] dark:text-slate-400 mx-auto" />
              </div>
            ) : savedJobs.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-[#8B7355] dark:text-slate-600 mx-auto mb-3" />
                <p className="text-base text-[#6B5744] dark:text-slate-400">
                  No job descriptions yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#3D3229]/8 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
                {savedJobs.map((jd) => (
                  <div
                    key={jd.id}
                    className={cn(
                      'flex items-center gap-4 p-4 cursor-pointer transition-colors',
                      selectedJd?.id === jd.id
                        ? 'bg-[#FAF8F5] dark:bg-slate-800/70'
                        : 'hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50'
                    )}
                    onClick={() => handleSelectJd(jd)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-5 w-5 text-[#8B7355] dark:text-slate-500 flex-shrink-0" />
                        <p className="text-base font-semibold text-[#3D3229] dark:text-white truncate">
                          {jd.roleTitle ?? 'Unknown Role'}
                        </p>
                      </div>
                      <p className="text-sm text-[#6B5744] dark:text-slate-400 truncate pl-7">
                        {jd.companyName ?? 'Unknown Company'} • {jd.requiredSkillsCount} skills
                      </p>
                    </div>
                    {jd.matchPercentage !== null && (
                      <span
                        className={cn(
                          'text-sm font-semibold px-3 py-1 rounded-full',
                          jd.matchPercentage >= 80
                            ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                            : jd.matchPercentage >= 60
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-red-500/20 text-red-600 dark:text-red-400'
                        )}
                      >
                        {jd.matchPercentage}%
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(jd.id);
                      }}
                      className="p-2 text-[#8B7355] dark:text-slate-500 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <ChevronRight className="h-5 w-5 text-[#8B7355] dark:text-slate-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Analysis Results */}
        <div className="lg:col-span-2">
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 mb-6">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="h-6 w-6" />
                <p className="text-base font-medium">{error}</p>
              </div>
              {error.includes('resume') && (
                <Link
                  href="/settings?tab=resume"
                  className="text-base text-orange-500 hover:text-orange-400 mt-3 inline-block font-medium"
                >
                  Upload a resume →
                </Link>
              )}
            </div>
          )}

          {selectedJd ? (
            <GapResults
              jd={selectedJd}
              analysis={analysis}
              onAnalyze={handleRunAnalysis}
              analyzing={analyzing}
            />
          ) : (
            <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-16 text-center">
              <FileText className="h-16 w-16 text-[#8B7355] dark:text-slate-600 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-[#3D3229] dark:text-white mb-3">
                Select a Job Description
              </h3>
              <p className="text-lg text-[#6B5744] dark:text-slate-400 max-w-md mx-auto">
                Paste a new job description or select a saved one to see gap
                analysis and practice recommendations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6">
        <h4 className="text-lg font-semibold text-[#3D3229] dark:text-white mb-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-[#6B5744] dark:text-slate-400" />
          How to Use This Feature
        </h4>
        <ol className="text-base text-[#6B5744] dark:text-slate-400 space-y-2 list-decimal list-inside">
          <li>Paste a job description you&apos;re interested in</li>
          <li>Run gap analysis to compare against your resume</li>
          <li>Review missing skills and experience gaps</li>
          <li>Generate a targeted practice interview to address gaps</li>
        </ol>
      </div>
    </div>
  );
}
