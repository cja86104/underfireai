'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import {
  INTERVIEWER_ARCHETYPES,
  type InterviewerArchetype,
} from '@/types/interviewer';
import type { InterviewType, CompanyStyle } from '@/types/database';

interface BackgroundGeneratorProps {
  archetype: InterviewerArchetype;
  interviewType: InterviewType;
  companyStyle?: CompanyStyle | null;
  roleTarget?: string | null;
  interviewerName: string;
  onBackstoryGenerated?: (backstory: string) => void;
  className?: string;
}

export function BackgroundGenerator({
  archetype,
  interviewType,
  companyStyle,
  roleTarget,
  interviewerName,
  onBackstoryGenerated,
  className,
}: BackgroundGeneratorProps): React.JSX.Element {
  const [backstory, setBackstory] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const archetypeData = INTERVIEWER_ARCHETYPES[archetype];

  const generateBackstory = async (): Promise<void> => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/generate-interviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewType,
          companyStyle,
          roleTarget,
          difficultyLevel: 5,
          archetypeHint: archetype,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate backstory');
      }

      const data = await response.json() as { interviewer?: { backstory?: string } };
      const newBackstory = data.interviewer?.backstory;

      if (newBackstory) {
        setBackstory(newBackstory);
        onBackstoryGenerated?.(newBackstory);
      } else {
        throw new Error('No backstory returned');
      }
    } catch (err) {
      console.error('Error generating backstory:', err);
      setError('Failed to generate backstory. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (): Promise<void> => {
    if (backstory) {
      await navigator.clipboard.writeText(backstory);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className={cn('border-slate-800 bg-slate-900/50 p-4', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              Background Generator
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Generate a hidden backstory for {interviewerName}
            </p>
          </div>
        </div>

        {/* Archetype Info */}
        <div className="rounded-lg bg-slate-800/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-orange-400">
              {archetypeData.name}
            </span>
            <span className="text-xs text-slate-500">
              ({archetype})
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {archetypeData.description}
          </p>
        </div>

        {/* Context */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-slate-800/30 px-2 py-1.5">
            <span className="text-slate-500">Interview:</span>{' '}
            <span className="text-slate-300">{interviewType}</span>
          </div>
          {companyStyle && (
            <div className="rounded bg-slate-800/30 px-2 py-1.5">
              <span className="text-slate-500">Company:</span>{' '}
              <span className="text-slate-300">{companyStyle}</span>
            </div>
          )}
          {roleTarget && (
            <div className="rounded bg-slate-800/30 px-2 py-1.5 col-span-2">
              <span className="text-slate-500">Role:</span>{' '}
              <span className="text-slate-300">{roleTarget}</span>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <Button
          onClick={generateBackstory}
          disabled={isGenerating}
          className="w-full bg-orange-500 hover:bg-orange-600"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : backstory ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Backstory
            </>
          )}
        </Button>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Generated Backstory */}
        {backstory && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Generated Backstory
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="h-6 px-2 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1 text-green-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                {backstory}
              </p>
            </div>
            <p className="text-xs text-slate-500 italic">
              This backstory is hidden from candidates and shapes interview behavior.
            </p>
          </div>
        )}

        {/* Traits Preview */}
        {backstory && (
          <div className="pt-3 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-400 mb-2">
              This interviewer will watch for:
            </p>
            <div className="space-y-1">
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-slate-500">Red flags:</span>
                {archetypeData.defaultRedFlags.slice(0, 3).map((flag) => (
                  <span
                    key={flag}
                    className="text-xs bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded"
                  >
                    {flag}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-slate-500">Green flags:</span>
                {archetypeData.defaultGreenFlags.slice(0, 3).map((flag) => (
                  <span
                    key={flag}
                    className="text-xs bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
