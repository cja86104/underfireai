'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Target,
  MessageSquare,
  CheckCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Play,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { format } from 'date-fns';
import type { InterviewMessage, InterviewType, CompanyStyle } from '@/types/database';

interface InterviewResultsProps {
  session: {
    id: string;
    interviewType: InterviewType;
    targetRole: string | null;
    targetCompany: string | null;
    difficulty: number;
    startedAt: string;
    endedAt: string | null;
    durationSeconds: number | null;
  };
  interviewer: {
    id: string;
    name: string;
    avatarUrl: string | null;
    interviewType: InterviewType;
    companyStyle: CompanyStyle | null;
  };
  scores: {
    overallScore: number | null;
    clarityScore: number | null;
    confidenceScore: number | null;
    technicalDepth: number | null;
    starUsageScore: number | null;
    communicationScore: number | null;
    strengths: string[] | null;
    improvements: string[] | null;
    aiFeedback: string | null;
    interviewerImpression: string | null;
    keyMoments: { type: string; description: string }[] | null;
  } | null;
  messages: InterviewMessage[];
}

export function InterviewResults({
  session,
  interviewer,
  scores,
  messages,
}: InterviewResultsProps): React.JSX.Element {
  const [showTranscript, setShowTranscript] = useState(false);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'text-slate-400';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number | null): string => {
    if (score === null) return 'bg-slate-500/20';
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-amber-500/20';
    return 'bg-red-500/20';
  };

  const scoreCategories = [
    { key: 'clarityScore', label: 'Clarity', value: scores?.clarityScore },
    { key: 'confidenceScore', label: 'Confidence', value: scores?.confidenceScore },
    { key: 'technicalDepth', label: 'Technical Depth', value: scores?.technicalDepth },
    { key: 'starUsageScore', label: 'STAR Usage', value: scores?.starUsageScore },
    { key: 'communicationScore', label: 'Communication', value: scores?.communicationScore },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Interview Results</h1>
          <p className="text-slate-400 mt-1">
            {format(new Date(session.startedAt), 'MMMM d, yyyy')} • {interviewer.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/interview/${session.id}/replay`}
            className="inline-flex items-center gap-2 rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-400 hover:bg-orange-500/20 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Replay Session
          </Link>
          <Link
            href="/history"
            className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            View History
          </Link>
          <Link
            href="/interview/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            <Play className="h-4 w-4" />
            New Interview
          </Link>
        </div>
      </div>

      {/* Overall Score Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Score Circle */}
          <div className="flex-shrink-0">
            <div
              className={cn(
                'relative h-32 w-32 rounded-full flex items-center justify-center',
                getScoreBgColor(scores?.overallScore ?? null)
              )}
            >
              <div className="text-center">
                <p className={cn('text-4xl font-bold', getScoreColor(scores?.overallScore ?? null))}>
                  {scores?.overallScore ?? '—'}
                </p>
                <p className="text-sm text-slate-400">Overall</p>
              </div>
              {scores?.overallScore != null && (
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-slate-700"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(scores.overallScore / 100) * 283} 283`}
                    className={getScoreColor(scores.overallScore)}
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Session Info */}
          <div className="flex-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-slate-400">Interview Type</p>
                <p className="font-medium text-white capitalize">
                  {session.interviewType.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Duration</p>
                <p className="font-medium text-white">
                  {session.durationSeconds ? formatDuration(session.durationSeconds) : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Difficulty</p>
                <p className="font-medium text-white">{session.difficulty}/10</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Questions</p>
                <p className="font-medium text-white">
                  {messages.filter((m) => m.role === 'interviewer').length}
                </p>
              </div>
            </div>

            {session.targetRole && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400">Target Position</p>
                <p className="font-medium text-white">
                  {session.targetRole}
                  {session.targetCompany && ` at ${session.targetCompany}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Score Breakdown</h2>
        <div className="space-y-4">
          {scoreCategories.map((category) => (
            <div key={category.key} className="flex items-center gap-4">
              <div className="w-32 flex-shrink-0">
                <p className="text-sm text-slate-300">{category.label}</p>
              </div>
              <div className="flex-1">
                <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      category.value != null && category.value >= 80
                        ? 'bg-green-500'
                        : category.value != null && category.value >= 60
                        ? 'bg-amber-500'
                        : category.value != null
                        ? 'bg-red-500'
                        : 'bg-slate-600'
                    )}
                    style={{ width: `${category.value ?? 0}%` }}
                  />
                </div>
              </div>
              <div className="w-12 text-right">
                <span className={cn('font-medium', getScoreColor(category.value ?? null))}>
                  {category.value ?? '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-white">Strengths</h2>
          </div>
          {scores?.strengths && scores.strengths.length > 0 ? (
            <ul className="space-y-3">
              {scores.strengths.map((strength) => (
                <li key={strength} className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-slate-300">{strength}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">No strengths identified</p>
          )}
        </div>

        {/* Areas for Improvement */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-white">Areas for Improvement</h2>
          </div>
          {scores?.improvements && scores.improvements.length > 0 ? (
            <ul className="space-y-3">
              {scores.improvements.map((improvement) => (
                <li key={improvement} className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="text-slate-300">{improvement}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">No improvements identified</p>
          )}
        </div>
      </div>

      {/* AI Feedback */}
      {scores?.aiFeedback && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-white">AI Coach Feedback</h2>
          </div>
          <p className="text-slate-300 leading-relaxed">{scores.aiFeedback}</p>
        </div>
      )}

      {/* Interviewer Impression */}
      {scores?.interviewerImpression && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
              {interviewer.avatarUrl ? (
                <Image
                  src={interviewer.avatarUrl}
                  alt={interviewer.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-slate-300">{interviewer.name[0]}</span>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-white">Interviewer&apos;s Perspective</h2>
              <p className="text-sm text-slate-400">{interviewer.name}</p>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed italic">
            &ldquo;{scores.interviewerImpression}&rdquo;
          </p>
        </div>
      )}

      {/* Key Moments */}
      {scores?.keyMoments && scores.keyMoments.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Key Moments</h2>
          <div className="space-y-3">
            {scores.keyMoments.map((moment) => (
              <div
                key={moment.description}
                className={cn(
                  'flex items-start gap-3 rounded-lg p-3',
                  moment.type === 'strong'
                    ? 'bg-green-500/10 border border-green-500/20'
                    : moment.type === 'weak'
                    ? 'bg-red-500/10 border border-red-500/20'
                    : 'bg-blue-500/10 border border-blue-500/20'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
                    moment.type === 'strong'
                      ? 'bg-green-500/20 text-green-400'
                      : moment.type === 'weak'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-blue-500/20 text-blue-400'
                  )}
                >
                  {moment.type === 'strong' ? 'Strong' : moment.type === 'weak' ? 'Weak' : 'Turning Point'}
                </span>
                <p className="text-slate-300 text-sm">{moment.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="flex items-center justify-between p-6">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">Full Transcript</h2>
            <span className="text-sm text-slate-500">({messages.length} messages)</span>
            {showTranscript ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
          <Link
            href={`/interview/${session.id}/replay`}
            className="inline-flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Detailed Replay
          </Link>
        </div>

        {showTranscript && (
          <div className="border-t border-slate-800 p-6 space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'candidate' && 'flex-row-reverse'
                )}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs',
                    message.role === 'interviewer'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-orange-500 text-white'
                  )}
                >
                  {message.role === 'interviewer' ? interviewer.name[0] : 'You'}
                </div>
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2',
                    message.role === 'interviewer'
                      ? 'bg-slate-800 text-slate-200'
                      : 'bg-orange-500/20 text-slate-200'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next Steps */}
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-2">What&apos;s Next?</h2>
        <p className="text-slate-300 mb-4">
          Keep practicing to improve your scores. Try different interview types and difficulty levels.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/interview/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Practice Again
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/progress"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            View Progress
          </Link>
        </div>
      </div>
    </div>
  );
}
