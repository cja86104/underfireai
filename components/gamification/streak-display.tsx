'use client';

import { useMemo } from 'react';
import {
  Flame,
  Calendar,
  TrendingUp,
  Trophy,
  Zap,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  lastSessionDate?: string | null;
  weeklyGoal?: number;
  sessionsThisWeek?: number;
  className?: string;
}

interface StreakBadgeProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

interface WeeklyProgressProps {
  current: number;
  goal: number;
  className?: string;
}

function getStreakLevel(streak: number): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (streak >= 30) {
    return {
      label: 'On Fire!',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    };
  }
  if (streak >= 14) {
    return {
      label: 'Blazing',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    };
  }
  if (streak >= 7) {
    return {
      label: 'Heating Up',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    };
  }
  if (streak >= 3) {
    return {
      label: 'Warming Up',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    };
  }
  return {
    label: 'Getting Started',
    color: 'text-charcoal-600',
    bgColor: 'bg-stone-50',
    borderColor: 'border-stone-200',
  };
}

function getDaysSinceLastSession(lastSessionDate: string | null): number | null {
  if (!lastSessionDate) return null;
  const last = new Date(lastSessionDate);
  const now = new Date();
  const diffTime = now.getTime() - last.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function StreakBadge({
  streak,
  size = 'md',
  showLabel = true,
  animated = true,
}: StreakBadgeProps): React.JSX.Element {
  const level = getStreakLevel(streak);

  const sizeClasses = {
    sm: {
      container: 'px-2 py-1',
      icon: 'h-4 w-4',
      text: 'text-sm',
    },
    md: {
      container: 'px-3 py-1.5',
      icon: 'h-5 w-5',
      text: 'text-base',
    },
    lg: {
      container: 'px-4 py-2',
      icon: 'h-6 w-6',
      text: 'text-lg',
    },
  };

  const config = sizeClasses[size];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border font-semibold',
        config.container,
        level.bgColor,
        level.borderColor,
        level.color,
        animated && streak >= 7 && 'animate-pulse-fire'
      )}
    >
      <Flame className={cn(config.icon, streak >= 3 && 'text-fire-500')} />
      <span className={config.text}>{streak}</span>
      {showLabel && (
        <span className="text-xs font-normal opacity-75">day streak</span>
      )}
    </div>
  );
}

export function WeeklyProgress({
  current,
  goal,
  className,
}: WeeklyProgressProps): React.JSX.Element {
  const percentage = Math.min((current / goal) * 100, 100);
  const isComplete = current >= goal;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-charcoal-700">
          <Target className="h-4 w-4 text-fire-500" />
          <span>Weekly Goal</span>
        </div>
        <span
          className={cn(
            'font-medium',
            isComplete ? 'text-green-600' : 'text-charcoal-600'
          )}
        >
          {current} / {goal}
        </span>
      </div>

      <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isComplete
              ? 'bg-gradient-to-r from-green-500 to-emerald-400'
              : 'bg-gradient-to-r from-fire-500 to-amber-400'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isComplete && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <Trophy className="h-3 w-3" />
          Goal achieved!
        </div>
      )}
    </div>
  );
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  totalSessions,
  lastSessionDate,
  weeklyGoal = 5,
  sessionsThisWeek = 0,
  className,
}: StreakDisplayProps): React.JSX.Element {
  const level = useMemo(() => getStreakLevel(currentStreak), [currentStreak]);
  const daysSinceLast = getDaysSinceLastSession(lastSessionDate ?? null);

  const isAtRisk = daysSinceLast !== null && daysSinceLast >= 1;

  return (
    <div
      className={cn(
        'rounded-xl border bg-white shadow-card overflow-hidden',
        className
      )}
    >
      {/* Header with current streak */}
      <div
        className={cn(
          'p-6 border-b',
          level.bgColor,
          level.borderColor
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'rounded-full p-3',
                  currentStreak >= 7 ? 'bg-fire-500 shadow-glow-fire' : 'bg-stone-200'
                )}
              >
                <Flame
                  className={cn(
                    'h-8 w-8',
                    currentStreak >= 7 ? 'text-white' : 'text-charcoal-400'
                  )}
                />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-charcoal-900">
                    {currentStreak}
                  </span>
                  <span className="text-charcoal-500">day streak</span>
                </div>
                <p className={cn('text-sm font-medium', level.color)}>
                  {level.label}
                </p>
              </div>
            </div>
          </div>

          {isAtRisk && (
            <div className="rounded-lg bg-amber-100 border border-amber-200 px-3 py-2">
              <div className="flex items-center gap-2 text-amber-700">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Practice today to keep your streak!
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 divide-x divide-stone-200">
        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-charcoal-500 mb-1">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-xs">Best Streak</span>
          </div>
          <p className="text-2xl font-bold text-charcoal-900">{longestStreak}</p>
          <p className="text-xs text-charcoal-400">days</p>
        </div>

        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-charcoal-500 mb-1">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-xs">Total Sessions</span>
          </div>
          <p className="text-2xl font-bold text-charcoal-900">{totalSessions}</p>
          <p className="text-xs text-charcoal-400">completed</p>
        </div>

        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-charcoal-500 mb-1">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="text-xs">Last Practice</span>
          </div>
          <p className="text-2xl font-bold text-charcoal-900">
            {daysSinceLast === 0
              ? 'Today'
              : daysSinceLast === 1
              ? '1'
              : daysSinceLast ?? '-'}
          </p>
          <p className="text-xs text-charcoal-400">
            {daysSinceLast === 0
              ? ''
              : daysSinceLast === 1
              ? 'day ago'
              : daysSinceLast
              ? 'days ago'
              : 'No sessions'}
          </p>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="p-4 border-t border-stone-200">
        <WeeklyProgress current={sessionsThisWeek} goal={weeklyGoal} />
      </div>
    </div>
  );
}

/**
 * Compact streak indicator for headers/cards
 */
export function StreakIndicator({
  streak,
  className,
}: {
  streak: number;
  className?: string;
}): React.JSX.Element | null {
  if (streak === 0) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
        'bg-fire-50 border border-fire-200',
        className
      )}
    >
      <Flame className="h-3 w-3 text-fire-500" />
      <span className="text-xs font-semibold text-fire-600">{streak}</span>
    </div>
  );
}
