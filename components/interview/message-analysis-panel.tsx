'use client';

import { useState } from 'react';
import {
  Star,
  MessageCircle,
  Brain,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Volume2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { InterviewMessage } from '@/types/database';

interface MessageAnalysisPanelProps {
  message: InterviewMessage;
  messageNumber: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function MessageAnalysisPanel({
  message,
  messageNumber,
  isExpanded,
  onToggle,
}: MessageAnalysisPanelProps): React.JSX.Element {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const analysis = message.analysis;

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    if (score >= 40) return 'bg-orange-500/20';
    return 'bg-red-500/20';
  };

  const playAudio = (): void => {
    if (!message.audio_url) return;
    setIsPlayingAudio(true);
    const audio = new Audio(message.audio_url);
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
    void audio.play();
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        message.role === 'interviewer'
          ? 'border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-800/50'
          : 'border-orange-500/30 bg-orange-50 dark:bg-orange-500/5',
        isExpanded && 'ring-2 ring-orange-500/50'
      )}
    >
      {/* Message Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-[#3D3229]/5 dark:hover:bg-slate-700/30 transition-colors rounded-t-xl"
      >
        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold',
            message.role === 'interviewer'
              ? 'bg-[#3D3229]/10 dark:bg-slate-700 text-[#3D3229] dark:text-slate-200'
              : 'bg-orange-500 text-white'
          )}
        >
          {message.role === 'interviewer' ? 'I' : 'Y'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-base text-[#3D3229]/60 dark:text-slate-400 font-medium">#{messageNumber}</span>
            <span className="text-lg font-semibold text-[#3D3229] dark:text-slate-100 capitalize">
              {message.role === 'interviewer' ? 'Interviewer' : 'Your Response'}
            </span>
            {message.response_time_seconds && (
              <span className="flex items-center gap-1.5 text-base text-[#3D3229]/60 dark:text-slate-400">
                <Clock className="h-4 w-4" />
                {message.response_time_seconds}s
              </span>
            )}
            {message.audio_url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playAudio();
                }}
                className={cn(
                  'flex items-center gap-1.5 text-base px-3 py-1 rounded-lg font-medium',
                  isPlayingAudio
                    ? 'bg-orange-500 text-white'
                    : 'bg-[#3D3229]/10 dark:bg-slate-700 text-[#3D3229] dark:text-slate-300 hover:bg-[#3D3229]/20 dark:hover:text-white'
                )}
              >
                <Volume2 className="h-4 w-4" />
                {isPlayingAudio ? 'Playing...' : 'Play'}
              </button>
            )}
          </div>
          <p className="text-lg text-[#3D3229]/80 dark:text-slate-300 truncate mt-1">
            {message.content.substring(0, 100)}
            {message.content.length > 100 && '...'}
          </p>
        </div>

        {/* Quick Score Preview (for candidate messages only) */}
        {message.role === 'candidate' && analysis && (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'px-4 py-2 rounded-lg text-lg font-bold',
                getScoreBgColor(analysis.star_score ?? 0),
                getScoreColor(analysis.star_score ?? 0)
              )}
            >
              {analysis.star_score ?? 0}%
            </div>
          </div>
        )}

        {isExpanded ? (
          <ChevronUp className="h-6 w-6 text-[#3D3229]/60 dark:text-slate-400" />
        ) : (
          <ChevronDown className="h-6 w-6 text-[#3D3229]/60 dark:text-slate-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#3D3229]/10 dark:border-slate-700/50 p-6 space-y-5">
          {/* Full Message */}
          <div className="prose prose-lg max-w-none">
            <p className="whitespace-pre-wrap text-lg text-[#3D3229] dark:text-slate-200 leading-relaxed">{message.content}</p>
          </div>

          {/* Analysis Details (for candidate messages) */}
          {message.role === 'candidate' && analysis && (
            <>
              {/* Score Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <ScoreCard
                  icon={<Star className="h-5 w-5" />}
                  label="STAR Score"
                  score={analysis.star_score ?? 0}
                />
                <ScoreCard
                  icon={<MessageCircle className="h-5 w-5" />}
                  label="Clarity"
                  score={analysis.clarity_score ?? 0}
                />
                <ScoreCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Confidence"
                  score={analysis.confidence_score ?? 0}
                />
                <ScoreCard
                  icon={<Brain className="h-5 w-5" />}
                  label="Relevance"
                  score={analysis.relevance_score ?? 0}
                />
                <ScoreCard
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  label="Depth"
                  score={analysis.depth_score ?? 0}
                />
              </div>

              {/* Key Points */}
              {analysis.key_points && analysis.key_points.length > 0 && (
                <div className="rounded-xl bg-[#FAF8F5] dark:bg-slate-800/50 border border-[#3D3229]/10 dark:border-slate-700 p-5">
                  <h4 className="text-lg font-bold text-[#3D3229] dark:text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Key Points Identified
                  </h4>
                  <ul className="space-y-2">
                    {analysis.key_points.map((point) => (
                      <li
                        key={point}
                        className="text-lg text-[#3D3229] dark:text-slate-300 flex items-start gap-3"
                      >
                        <span className="text-green-600 dark:text-green-400 mt-1.5">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Filler Words */}
              {analysis.filler_words && analysis.filler_words.length > 0 && (
                <div className="rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 p-5">
                  <h4 className="text-lg font-bold text-yellow-700 dark:text-yellow-400 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Filler Words Detected
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {[...new Set(analysis.filler_words)].map((word) => (
                      <span
                        key={word}
                        className="px-4 py-2 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 text-lg font-medium"
                      >
                        &quot;{word}&quot;
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Word Count */}
              <div className="flex items-center gap-6 text-base text-[#3D3229]/70 dark:text-slate-400">
                <span>Word Count: {analysis.word_count ?? 0}</span>
                {message.response_time_seconds && (
                  <span>
                    Speaking Rate:{' '}
                    {Math.round(
                      ((analysis.word_count ?? 0) / message.response_time_seconds) * 60
                    )}{' '}
                    words/min
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface ScoreCardProps {
  icon: React.ReactNode;
  label: string;
  score: number;
}

function ScoreCard({ icon, label, score }: ScoreCardProps): React.JSX.Element {
  const getScoreColor = (s: number): string => {
    if (s >= 80) return 'text-green-600 dark:text-green-400';
    if (s >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (s >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (s: number): string => {
    if (s >= 80) return 'bg-green-500';
    if (s >= 60) return 'bg-yellow-500';
    if (s >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="rounded-xl bg-[#FAF8F5] dark:bg-slate-800/50 border border-[#3D3229]/10 dark:border-slate-700 p-4">
      <div className="flex items-center gap-2 text-[#3D3229] dark:text-slate-300 mb-3">
        {icon}
        <span className="text-base font-medium">{label}</span>
      </div>
      <div className={cn('text-3xl font-bold', getScoreColor(score))}>{score}%</div>
      <div className="h-2 bg-[#3D3229]/10 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getProgressColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
