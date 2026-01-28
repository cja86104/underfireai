'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Pause, Play, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { InterviewType } from '@/types/database';

interface TimerDisplayProps {
  isRunning: boolean;
  interviewType?: InterviewType;
  onTimeUp?: () => void;
  onTick?: (elapsed: number) => void;
  showProgress?: boolean;
  allowPause?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface InlineTimerProps {
  elapsed: number;
  limit?: number;
  size?: 'sm' | 'md';
  className?: string;
}

interface SessionTimerProps {
  startedAt: string;
  className?: string;
}

// Time limits per interview type (in seconds)
const INTERVIEW_TIME_LIMITS: Record<InterviewType, number> = {
  behavioral: 180,    // 3 minutes per response
  technical: 300,     // 5 minutes per response
  case: 600,          // 10 minutes per response
  hr: 120,            // 2 minutes per response
  panel: 180,         // 3 minutes per response
  phone_screen: 120,  // 2 minutes per response
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getWarningLevel(elapsed: number, limit: number): 'normal' | 'warning' | 'danger' {
  const percentage = (elapsed / limit) * 100;
  if (percentage >= 90) return 'danger';
  if (percentage >= 75) return 'warning';
  return 'normal';
}

export function TimerDisplay({
  isRunning,
  interviewType = 'behavioral',
  onTimeUp,
  onTick,
  showProgress = true,
  allowPause = true,
  size = 'md',
  className,
}: TimerDisplayProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeLimit = INTERVIEW_TIME_LIMITS[interviewType];

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          onTick?.(next);

          if (next >= timeLimit) {
            onTimeUp?.();
          }

          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, timeLimit, onTimeUp, onTick]);

  // Reset when not running
  useEffect(() => {
    if (!isRunning) {
      setElapsed(0);
      setIsPaused(false);
    }
  }, [isRunning]);

  const warningLevel = getWarningLevel(elapsed, timeLimit);
  const progress = Math.min((elapsed / timeLimit) * 100, 100);
  const remaining = Math.max(timeLimit - elapsed, 0);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 shadow-card',
        warningLevel === 'danger' && 'border-red-300 bg-red-50',
        warningLevel === 'warning' && 'border-amber-300 bg-amber-50',
        warningLevel === 'normal' && 'border-stone-200',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'rounded-full p-2',
              warningLevel === 'danger' && 'bg-red-100 text-red-600 animate-pulse',
              warningLevel === 'warning' && 'bg-amber-100 text-amber-600',
              warningLevel === 'normal' && 'bg-fire-100 text-fire-600'
            )}
          >
            {warningLevel === 'danger' ? (
              <AlertTriangle className={iconSizes[size]} />
            ) : (
              <Clock className={iconSizes[size]} />
            )}
          </div>

          <div>
            <div
              className={cn(
                'font-mono font-bold tabular-nums',
                sizeClasses[size],
                warningLevel === 'danger' && 'text-red-600',
                warningLevel === 'warning' && 'text-amber-600',
                warningLevel === 'normal' && 'text-charcoal-900'
              )}
            >
              {formatTime(elapsed)}
            </div>
            <div className="text-xs text-charcoal-500">
              {formatTime(remaining)} remaining
            </div>
          </div>
        </div>

        {allowPause && isRunning && (
          <button
            type="button"
            onClick={handleTogglePause}
            className={cn(
              'rounded-lg p-2 transition-colors',
              isPaused
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-stone-100 text-charcoal-600 hover:bg-stone-200'
            )}
            aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
          >
            {isPaused ? (
              <Play className={iconSizes[size]} />
            ) : (
              <Pause className={iconSizes[size]} />
            )}
          </button>
        )}
      </div>

      {showProgress && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                warningLevel === 'danger' && 'bg-red-500',
                warningLevel === 'warning' && 'bg-amber-500',
                warningLevel === 'normal' && 'bg-fire-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-charcoal-400">
            <span>0:00</span>
            <span>{formatTime(timeLimit)}</span>
          </div>
        </div>
      )}

      {isPaused && (
        <div className="mt-3 text-center text-sm text-amber-600 font-medium">
          Timer Paused
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline timer for headers/toolbars
 */
export function InlineTimer({
  elapsed,
  limit,
  size = 'md',
  className,
}: InlineTimerProps) {
  const warningLevel = limit ? getWarningLevel(elapsed, limit) : 'normal';

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg font-mono font-medium tabular-nums',
        sizeClasses[size],
        warningLevel === 'danger' && 'bg-red-100 text-red-600',
        warningLevel === 'warning' && 'bg-amber-100 text-amber-600',
        warningLevel === 'normal' && 'bg-stone-100 text-charcoal-700',
        className
      )}
    >
      <Clock className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {formatTime(elapsed)}
      {limit && (
        <span className="text-charcoal-400">/ {formatTime(limit)}</span>
      )}
    </div>
  );
}

/**
 * Session timer showing total duration from startedAt timestamp
 */
export function SessionTimer({
  startedAt,
  className,
}: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = new Date(startedAt).getTime();

    const updateElapsed = () => {
      const now = Date.now();
      const seconds = Math.floor((now - startTime) / 1000);
      setElapsed(Math.max(0, seconds));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const formattedTime = hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 text-sm text-charcoal-600',
        className
      )}
    >
      <Clock className="h-4 w-4" />
      <span className="font-mono tabular-nums">{formattedTime}</span>
      <span className="text-charcoal-400">session</span>
    </div>
  );
}
