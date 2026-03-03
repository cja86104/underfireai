'use client';

import { useState } from 'react';
import {
  FileText,
  Loader2,
  Search,
  AlertCircle,
  Building2,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// ===========================================
// TYPES
// ===========================================

interface ParsedJD {
  id: string;
  companyName: string | null;
  roleTitle: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
}

interface JobDescriptionAnalyzerProps {
  onAnalyzed: (jd: ParsedJD) => void;
}

// ===========================================
// COMPONENT
// ===========================================

export function JobDescriptionAnalyzer({
  onAnalyzed,
}: JobDescriptionAnalyzerProps): React.JSX.Element {
  const [rawText, setRawText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (rawText.trim().length < 50) {
      setError('Please paste a complete job description (minimum 50 characters)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/job-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawText.trim(),
          sourceUrl: sourceUrl.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? 'Failed to parse job description');
      }

      const data = (await response.json()) as {
        jobDescription: ParsedJD;
      };

      onAnalyzed(data.jobDescription);
      setRawText('');
      setSourceUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="rounded-xl bg-blue-500/10 p-3">
          <FileText className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#3D3229] dark:text-white">
            Analyze Job Description
          </h2>
          <p className="text-base text-[#6B5744] dark:text-slate-400">
            Paste a job description to find gaps and generate targeted practice
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Job Description Input */}
        <div>
          <label
            htmlFor="jd-text"
            className="block text-base font-medium text-[#3D3229] dark:text-slate-200 mb-2"
          >
            Job Description
          </label>
          <textarea
            id="jd-text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={8}
            className={cn(
              'w-full rounded-xl border bg-[#FAF8F5] dark:bg-slate-800/50 px-4 py-3 text-base text-[#3D3229] dark:text-white placeholder:text-[#8B7355] dark:placeholder:text-slate-500',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
              'border-[#3D3229]/15 dark:border-slate-700'
            )}
          />
          <p className="text-sm text-[#8B7355] dark:text-slate-500 mt-2">
            {rawText.length} characters
            {rawText.length > 0 && rawText.length < 50 && ' (minimum 50)'}
          </p>
        </div>

        {/* Source URL (Optional) */}
        <div>
          <label
            htmlFor="source-url"
            className="block text-base font-medium text-[#3D3229] dark:text-slate-200 mb-2"
          >
            Source URL{' '}
            <span className="text-[#8B7355] dark:text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            id="source-url"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://linkedin.com/jobs/..."
            className={cn(
              'w-full rounded-xl border bg-[#FAF8F5] dark:bg-slate-800/50 px-4 py-3 text-base text-[#3D3229] dark:text-white placeholder:text-[#8B7355] dark:placeholder:text-slate-500',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
              'border-[#3D3229]/15 dark:border-slate-700'
            )}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 text-base bg-red-500/10 rounded-xl p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || rawText.trim().length < 50}
          className={cn(
            'w-full inline-flex items-center justify-center gap-3 rounded-xl px-6 py-4 text-lg font-semibold transition-colors',
            'bg-blue-500 text-white hover:bg-blue-600',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              Analyze Job Description
            </>
          )}
        </button>
      </form>

      {/* Preview hints */}
      {rawText.length >= 50 && !loading && (
        <div className="mt-6 pt-6 border-t border-[#3D3229]/10 dark:border-slate-700">
          <p className="text-sm text-[#8B7355] dark:text-slate-500 mb-3 font-medium">Preview detected:</p>
          <div className="flex flex-wrap gap-2">
            {detectPreviewInfo(rawText).map((item, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2 rounded-full bg-[#FAF8F5] dark:bg-slate-800 border border-[#3D3229]/10 dark:border-slate-700 px-4 py-2 text-sm"
              >
                {item.type === 'company' && (
                  <Building2 className="h-4 w-4 text-[#6B5744] dark:text-slate-400" />
                )}
                {item.type === 'role' && (
                  <Briefcase className="h-4 w-4 text-[#6B5744] dark:text-slate-400" />
                )}
                <span className="text-[#3D3229] dark:text-slate-200 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple preview detection
function detectPreviewInfo(
  text: string
): { type: 'company' | 'role'; value: string }[] {
  const hints: { type: 'company' | 'role'; value: string }[] = [];

  // Common patterns for company names
  const companyPatterns = [
    /at\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+is|\s+we|\s*,)/,
    /([A-Z][A-Za-z0-9\s&]+?)\s+is\s+(?:looking|seeking|hiring)/i,
  ];

  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match?.[1] && match[1].length < 50) {
      hints.push({ type: 'company', value: match[1].trim() });
      break;
    }
  }

  // Common patterns for role titles
  const rolePatterns = [
    /(?:hiring|seeking|looking\s+for)\s+(?:a\s+)?([A-Z][A-Za-z\s]+?(?:Engineer|Developer|Designer|Manager|Analyst|Lead|Director|Architect))/i,
    /^([A-Z][A-Za-z\s]+?(?:Engineer|Developer|Designer|Manager|Analyst|Lead|Director|Architect))/m,
  ];

  for (const pattern of rolePatterns) {
    const match = text.match(pattern);
    if (match?.[1] && match[1].length < 60) {
      hints.push({ type: 'role', value: match[1].trim() });
      break;
    }
  }

  return hints;
}
