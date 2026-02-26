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
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-blue-500/10 p-2">
          <FileText className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            Analyze Job Description
          </h2>
          <p className="text-sm text-slate-400">
            Paste a job description to find gaps and generate targeted practice
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Job Description Input */}
        <div>
          <label
            htmlFor="jd-text"
            className="block text-sm font-medium text-slate-300 mb-1.5"
          >
            Job Description
          </label>
          <textarea
            id="jd-text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={10}
            className={cn(
              'w-full rounded-lg border bg-slate-800/50 px-4 py-3 text-sm text-white placeholder:text-slate-500',
              'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
              'border-slate-700'
            )}
          />
          <p className="text-xs text-slate-500 mt-1">
            {rawText.length} characters
            {rawText.length > 0 && rawText.length < 50 && ' (minimum 50)'}
          </p>
        </div>

        {/* Source URL (Optional) */}
        <div>
          <label
            htmlFor="source-url"
            className="block text-sm font-medium text-slate-300 mb-1.5"
          >
            Source URL{' '}
            <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            id="source-url"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://linkedin.com/jobs/..."
            className={cn(
              'w-full rounded-lg border bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-500',
              'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
              'border-slate-700'
            )}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || rawText.trim().length < 50}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
            'bg-blue-500 text-white hover:bg-blue-600',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Analyze Job Description
            </>
          )}
        </button>
      </form>

      {/* Preview hints */}
      {rawText.length >= 50 && !loading && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-2">Preview detected:</p>
          <div className="flex flex-wrap gap-2">
            {detectPreviewInfo(rawText).map((item, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-xs"
              >
                {item.type === 'company' && (
                  <Building2 className="h-3 w-3 text-slate-400" />
                )}
                {item.type === 'role' && (
                  <Briefcase className="h-3 w-3 text-slate-400" />
                )}
                <span className="text-slate-300">{item.value}</span>
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
