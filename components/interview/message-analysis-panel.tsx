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
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
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
        'rounded-lg border transition-all duration-200',
        message.role === 'interviewer'
          ? 'border-slate-700 bg-slate-800/50'
          : 'border-orange-500/30 bg-orange-500/5',
        isExpanded && 'ring-2 ring-orange-500/50'
      )}
    >
      {/* Message Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-700/30 transition-colors rounded-t-lg"
      >
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
            message.role === 'interviewer'
              ? 'bg-slate-700 text-slate-300'
              : 'bg-orange-500 text-white'
          )}
        >
          {message.role === 'interviewer' ? 'I' : 'Y'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">#{messageNumber}</span>
            <span className="text-sm font-medium text-slate-200 capitalize">
              {message.role === 'interviewer' ? 'Interviewer' : 'Your Response'}
            </span>
            {message.response_time_seconds && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
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
                  'flex items-center gap-1 text-xs px-2 py-0.5 rounded',
                  isPlayingAudio
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                )}
              >
                <Volume2 className="h-3 w-3" />
                {isPlayingAudio ? 'Playing...' : 'Play'}
              </button>
            )}
          </div>
          <p className="text-sm text-slate-400 truncate mt-0.5">
            {message.content.substring(0, 100)}
            {message.content.length > 100 && '...'}
          </p>
        </div>

        {/* Quick Score Preview (for candidate messages only) */}
        {message.role === 'candidate' && analysis && (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                getScoreBgColor(analysis.star_score ?? 0),
                getScoreColor(analysis.star_score ?? 0)
              )}
            >
              {analysis.star_score ?? 0}%
            </div>
          </div>
        )}

        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-500" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-700/50 p-4 space-y-4">
          {/* Full Message */}
          <div className="prose prose-sm prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-slate-300">{message.content}</p>
          </div>

          {/* Analysis Details (for candidate messages) */}
          {message.role === 'candidate' && analysis && (
            <>
              {/* Score Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <ScoreCard
                  icon={<Star className="h-4 w-4" />}
                  label="STAR Score"
                  score={analysis.star_score ?? 0}
                />
                <ScoreCard
                  icon={<MessageCircle className="h-4 w-4" />}
                  label="Clarity"
                  score={analysis.clarity_score ?? 0}
                />
                <ScoreCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Confidence"
                  score={analysis.confidence_score ?? 0}
                />
                <ScoreCard
                  icon={<Brain className="h-4 w-4" />}
                  label="Relevance"
                  score={analysis.relevance_score ?? 0}
                />
                <ScoreCard
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Depth"
                  score={analysis.depth_score ?? 0}
                />
              </div>

              {/* Key Points */}
              {analysis.key_points && analysis.key_points.length > 0 && (
                <div className="rounded-lg bg-slate-800/50 p-3">
                  <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    Key Points Identified
                  </h4>
                  <ul className="space-y-1">
                    {analysis.key_points.map((point, idx) => (
                      <li
                        key={`point-${idx}`}
                        className="text-sm text-slate-400 flex items-start gap-2"
                      >
                        <span className="text-green-400 mt-1">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Filler Words */}
              {analysis.filler_words && analysis.filler_words.length > 0 && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                  <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Filler Words Detected
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.filler_words.map((word, idx) => (
                      <span
                        key={`filler-${idx}`}
                        className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-xs"
                      >
                        &quot;{word}&quot;
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Word Count */}
              <div className="flex items-center gap-4 text-xs text-slate-500">
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
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-yellow-400';
    if (s >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getProgressColor = (s: number): string => {
    if (s >= 80) return 'bg-green-500';
    if (s >= 60) return 'bg-yellow-500';
    if (s >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="rounded-lg bg-slate-800/50 p-3">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className={cn('text-xl font-bold', getScoreColor(score))}>{score}%</div>
      <div className="h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getProgressColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
