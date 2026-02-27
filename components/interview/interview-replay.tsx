'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  MessageSquare,
  Zap,
  Clock,
  Trophy,
  Code2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { InterviewTimeline } from './interview-timeline';
import { MessageAnalysisPanel } from './message-analysis-panel';
import { CodeReplayPanel, type CodeSubmissionReplay, type CodingChallengeReplay } from './code-replay-panel';
import type { InterviewMessage, KeyMoment } from '@/types/database';

interface SessionScores {
  overall_score: number | null;
  clarity_score: number | null;
  confidence_score: number | null;
  technical_depth: number | null;
  star_usage_score: number | null;
  communication_score: number | null;
}

interface InterviewReplayProps {
  sessionId: string;
  messages: InterviewMessage[];
  scores: SessionScores;
  keyMoments: KeyMoment[];
  interviewer: {
    name: string;
    avatarUrl: string | null;
  };
  interviewType: string;
  targetRole: string | null;
  totalDuration: number;
  startedAt: string;
  codingChallenge?: CodingChallengeReplay | null;
  codeSubmissions?: CodeSubmissionReplay[];
}

export function InterviewReplay({
  messages,
  scores,
  keyMoments,
  interviewer,
  interviewType,
  targetRole,
  totalDuration,
  codingChallenge,
  codeSubmissions = [],
}: InterviewReplayProps): React.JSX.Element {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [expandedMessageIndex, setExpandedMessageIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showStats, setShowStats] = useState(true);
  const [currentSubmissionIndex, setCurrentSubmissionIndex] = useState(
    codeSubmissions.length > 0 ? codeSubmissions.length - 1 : 0
  );
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const playbackRef = useRef<NodeJS.Timeout | null>(null);

  const hasCodingChallenge = codingChallenge && codeSubmissions.length > 0;

  // Calculate average scores from candidate messages
  const averageScores = useMemo(() => {
    const candidateMessages = messages.filter(
      (m) => m.role === 'candidate' && m.analysis
    );

    if (candidateMessages.length === 0) {
      return {
        star: 0,
        clarity: 0,
        confidence: 0,
        relevance: 0,
        depth: 0,
      };
    }

    const totals = candidateMessages.reduce(
      (acc, msg) => {
        const analysis = msg.analysis;
        if (!analysis) return acc;
        return {
          star: acc.star + (analysis.star_score ?? 0),
          clarity: acc.clarity + (analysis.clarity_score ?? 0),
          confidence: acc.confidence + (analysis.confidence_score ?? 0),
          relevance: acc.relevance + (analysis.relevance_score ?? 0),
          depth: acc.depth + (analysis.depth_score ?? 0),
        };
      },
      { star: 0, clarity: 0, confidence: 0, relevance: 0, depth: 0 }
    );

    const count = candidateMessages.length;
    return {
      star: Math.round(totals.star / count),
      clarity: Math.round(totals.clarity / count),
      confidence: Math.round(totals.confidence / count),
      relevance: Math.round(totals.relevance / count),
      depth: Math.round(totals.depth / count),
    };
  }, [messages]);

  // Auto-playback
  useEffect(() => {
    if (isPlaying && currentMessageIndex < messages.length - 1) {
      const baseDelay = 2000; // 2 seconds per message
      const delay = baseDelay / playbackSpeed;

      playbackRef.current = setTimeout(() => {
        setCurrentMessageIndex((prev) => prev + 1);
      }, delay);
    } else if (currentMessageIndex >= messages.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (playbackRef.current) {
        clearTimeout(playbackRef.current);
      }
    };
  }, [isPlaying, currentMessageIndex, messages.length, playbackSpeed]);

  // Scroll to current message
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const messageElement = container.querySelector(`[data-message-index="${currentMessageIndex}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMessageIndex]);

  const handleMessageSelect = useCallback((index: number): void => {
    setCurrentMessageIndex(index);
    setExpandedMessageIndex(index);
    setIsPlaying(false);
  }, []);

  const handleToggleExpand = useCallback((index: number): void => {
    setExpandedMessageIndex((prev) => (prev === index ? null : index));
  }, []);

  const goToPrevious = (): void => {
    if (currentMessageIndex > 0) {
      setCurrentMessageIndex((prev) => prev - 1);
      setIsPlaying(false);
    }
  };

  const goToNext = (): void => {
    if (currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex((prev) => prev + 1);
      setIsPlaying(false);
    }
  };

  const goToStart = (): void => {
    setCurrentMessageIndex(0);
    setIsPlaying(false);
  };

  const goToEnd = (): void => {
    setCurrentMessageIndex(messages.length - 1);
    setIsPlaying(false);
  };

  const togglePlayback = (): void => {
    if (currentMessageIndex >= messages.length - 1) {
      setCurrentMessageIndex(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const cycleSpeed = (): void => {
    const speeds = [1, 1.5, 2, 0.5];
    const currentIndex = speeds.indexOf(playbackSpeed);
    setPlaybackSpeed(speeds[(currentIndex + 1) % speeds.length]);
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5] dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#3D3229]/10 dark:bg-slate-700 flex items-center justify-center text-2xl font-bold text-[#3D3229] dark:text-slate-200">
              {interviewer.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#3D3229] dark:text-white">{interviewer.name}</h2>
              <p className="text-lg text-[#3D3229] dark:text-slate-300 capitalize">
                {interviewType.replace('_', ' ')} Interview
                {targetRole && ` • ${targetRole}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Overall Score */}
          <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#3D3229]/10 dark:border-slate-700">
            <Trophy className="h-7 w-7 text-orange-500" />
            <span className="text-3xl font-bold text-orange-500">
              {scores.overall_score ?? 0}%
            </span>
          </div>

          {/* Toggle Stats */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-xl text-lg font-semibold transition-colors',
              showStats
                ? 'bg-orange-500 text-white'
                : 'bg-[#FAF8F5] dark:bg-slate-800 border border-[#3D3229]/10 dark:border-slate-700 text-[#3D3229] dark:text-slate-300 hover:bg-[#3D3229]/5 dark:hover:bg-slate-700'
            )}
          >
            <BarChart3 className="h-5 w-5" />
            Stats
          </button>
        </div>
      </div>

      {/* Stats Bar (collapsible) */}
      {showStats && (
        <div className="px-8 py-4 border-b border-[#3D3229]/10 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <StatItem label="STAR" value={averageScores.star} />
              <StatItem label="Clarity" value={averageScores.clarity} />
              <StatItem label="Confidence" value={averageScores.confidence} />
              <StatItem label="Relevance" value={averageScores.relevance} />
              <StatItem label="Depth" value={averageScores.depth} />
            </div>
            <div className="flex items-center gap-6 text-lg text-[#3D3229] dark:text-slate-400">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {messages.length} messages
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {formatDuration(totalDuration)}
              </span>
              {hasCodingChallenge && (
                <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Code2 className="h-5 w-5" />
                  {codeSubmissions.length} submission{codeSubmissions.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="px-8 py-5 border-b border-[#3D3229]/10 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30">
        <InterviewTimeline
          messages={messages}
          keyMoments={keyMoments}
          currentMessageIndex={currentMessageIndex}
          onMessageSelect={handleMessageSelect}
          totalDuration={totalDuration}
        />
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-5 px-8 py-4 border-b border-[#3D3229]/10 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
        <button
          onClick={goToStart}
          className="p-3 rounded-xl text-[#3D3229] dark:text-slate-400 hover:text-[#8B5A2B] dark:hover:text-white hover:bg-[#3D3229]/5 dark:hover:bg-slate-800 transition-colors"
          title="Go to start"
        >
          <SkipBack className="h-6 w-6" />
        </button>

        <button
          onClick={goToPrevious}
          disabled={currentMessageIndex === 0}
          className="p-3 rounded-xl text-[#3D3229] dark:text-slate-400 hover:text-[#8B5A2B] dark:hover:text-white hover:bg-[#3D3229]/5 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          title="Previous message"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={togglePlayback}
          className="p-4 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
        </button>

        <button
          onClick={goToNext}
          disabled={currentMessageIndex >= messages.length - 1}
          className="p-3 rounded-xl text-[#3D3229] dark:text-slate-400 hover:text-[#8B5A2B] dark:hover:text-white hover:bg-[#3D3229]/5 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          title="Next message"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <button
          onClick={goToEnd}
          className="p-3 rounded-xl text-[#3D3229] dark:text-slate-400 hover:text-[#8B5A2B] dark:hover:text-white hover:bg-[#3D3229]/5 dark:hover:bg-slate-800 transition-colors"
          title="Go to end"
        >
          <SkipForward className="h-6 w-6" />
        </button>

        <button
          onClick={cycleSpeed}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#3D3229]/10 dark:border-slate-700 text-lg font-semibold text-[#3D3229] dark:text-slate-200 hover:bg-[#3D3229]/5 dark:hover:bg-slate-700 transition-colors"
          title="Playback speed"
        >
          <Zap className="h-5 w-5" />
          {playbackSpeed}x
        </button>

        <span className="text-lg text-[#3D3229] dark:text-slate-400 font-medium">
          Message {currentMessageIndex + 1} of {messages.length}
        </span>
      </div>

      {/* Messages List */}
      <div
        ref={messagesContainerRef}
        className={cn(
          'overflow-y-auto p-8 space-y-4 scrollbar-thin',
          hasCodingChallenge ? 'flex-1 min-h-0' : 'flex-1'
        )}
      >
        {messages.map((message, index) => (
          <div
            key={message.id}
            data-message-index={index}
            className={cn(
              'transition-all duration-300',
              index === currentMessageIndex && 'scale-[1.01]',
              index < currentMessageIndex && 'opacity-60',
              index > currentMessageIndex && 'opacity-40'
            )}
          >
            <MessageAnalysisPanel
              message={message}
              messageNumber={index + 1}
              isExpanded={expandedMessageIndex === index}
              onToggle={() => handleToggleExpand(index)}
            />
          </div>
        ))}
      </div>

      {/* Code Replay Panel */}
      {hasCodingChallenge && (
        <CodeReplayPanel
          challenge={codingChallenge}
          submissions={codeSubmissions}
          currentSubmissionIndex={currentSubmissionIndex}
          onSubmissionSelect={setCurrentSubmissionIndex}
        />
      )}
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number;
}

function StatItem({ label, value }: StatItemProps): React.JSX.Element {
  const getColor = (v: number): string => {
    if (v >= 80) return 'text-green-600 dark:text-green-400';
    if (v >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (v >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-base text-[#3D3229] dark:text-slate-400 font-medium">{label}</span>
      <span className={cn('text-xl font-bold', getColor(value))}>{value}%</span>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
