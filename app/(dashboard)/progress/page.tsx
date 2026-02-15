import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  TrendingUp,
  Target,
  Clock,
  Zap,
  Award,
  Calendar,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { getCurrentUser, getUserProgress, getUserSessions } from '@/lib/supabase/server';
import { cn } from '@/lib/utils/cn';
import { format, startOfWeek, eachDayOfInterval } from 'date-fns';

export const metadata: Metadata = {
  title: 'Progress',
  description: 'Track your interview preparation progress over time.',
};

export default async function ProgressPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [progress, sessions] = await Promise.all([
    getUserProgress(),
    getUserSessions(100),
  ]);

  // Calculate weekly activity
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekDays = eachDayOfInterval({ start: weekStart, end: today });
  
  const weeklyActivity = weekDays.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const daySessions = sessions.filter(
      (s) => format(new Date(s.started_at), 'yyyy-MM-dd') === dayStr
    );
    return {
      day: format(day, 'EEE'),
      date: dayStr,
      count: daySessions.length,
      avgScore: daySessions.length > 0
        ? Math.round(
            daySessions.reduce((acc, s) => acc + (s.session_scores?.overall_score ?? 0), 0) /
            (daySessions.filter((s) => s.session_scores?.overall_score).length || 1)
          )
        : 0,
    };
  });

  // Calculate score trend (last 10 completed sessions)
  const completedSessions = sessions
    .filter((s) => s.status === 'completed' && s.session_scores?.overall_score)
    .slice(0, 10)
    .reverse();

  const scoreTrend = completedSessions.map((s, idx) => ({
    session: idx + 1,
    score: s.session_scores?.overall_score ?? 0,
    date: format(new Date(s.started_at), 'MMM d'),
  }));

  // Calculate score change
  const recentScores = completedSessions.slice(-5);
  const olderScores = completedSessions.slice(0, 5);
  const recentAvg = recentScores.length > 0
    ? recentScores.reduce((acc, s) => acc + (s.session_scores?.overall_score ?? 0), 0) / recentScores.length
    : 0;
  const olderAvg = olderScores.length > 0
    ? olderScores.reduce((acc, s) => acc + (s.session_scores?.overall_score ?? 0), 0) / olderScores.length
    : 0;
  const scoreChange = recentAvg - olderAvg;

  // Interview type breakdown
  const typeBreakdown = sessions.reduce<Record<string, { count: number; totalScore: number; scoredCount: number }>>((acc, s) => {
    const type = s.interview_type;
    if (!acc[type]) {
      acc[type] = { count: 0, totalScore: 0, scoredCount: 0 };
    }
    acc[type].count++;
    if (s.session_scores?.overall_score) {
      acc[type].totalScore += s.session_scores.overall_score;
      acc[type].scoredCount++;
    }
    return acc;
  }, {});

  const typeStats = Object.entries(typeBreakdown).map(([type, data]) => ({
    type,
    label: type.replace('_', ' '),
    count: data.count,
    avgScore: data.scoredCount > 0 ? Math.round(data.totalScore / data.scoredCount) : 0,
  })).sort((a, b) => b.count - a.count);

  // Badges
  const badges = progress?.badges ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Your Progress</h1>
        <p className="text-slate-400 mt-1">
          Track your improvement over time
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="Total Sessions"
          value={progress?.total_sessions ?? 0}
          color="blue"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Practice Hours"
          value={`${(progress?.total_hours ?? 0).toFixed(1)}h`}
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Average Score"
          value={progress?.avg_score ? `${progress.avg_score}%` : '—'}
          change={scoreChange !== 0 ? scoreChange : undefined}
          color="green"
        />
        <StatCard
          icon={<Zap className="h-5 w-5" />}
          label="Current Streak"
          value={`${progress?.current_streak ?? 0} days`}
          subtext={`Best: ${progress?.longest_streak ?? 0} days`}
          color="amber"
        />
      </div>

      {/* Weekly Activity */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-white">This Week</h2>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weeklyActivity.map((day) => (
            <div key={day.date} className="text-center">
              <p className="text-xs text-slate-500 mb-2">{day.day}</p>
              <div
                className={cn(
                  'aspect-square rounded-lg flex items-center justify-center text-sm font-medium',
                  day.count === 0
                    ? 'bg-slate-800 text-slate-500'
                    : day.count === 1
                    ? 'bg-orange-500/20 text-orange-400'
                    : day.count === 2
                    ? 'bg-orange-500/40 text-orange-300'
                    : 'bg-orange-500 text-white'
                )}
              >
                {day.count}
              </div>
              {day.avgScore > 0 && (
                <p className="text-xs text-slate-500 mt-1">{day.avgScore}%</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Score Trend & Type Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score Trend */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">Score Trend</h2>
          </div>
          {scoreTrend.length > 0 ? (
            <div className="space-y-3">
              {scoreTrend.map((item) => (
                <div key={item.date} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-16">{item.date}</span>
                  <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        item.score >= 80
                          ? 'bg-green-500'
                          : item.score >= 60
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      )}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-white w-12 text-right">
                    {item.score}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">
              Complete interviews to see your score trend
            </p>
          )}
        </div>

        {/* Interview Type Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">By Interview Type</h2>
          {typeStats.length > 0 ? (
            <div className="space-y-4">
              {typeStats.map((stat) => (
                <div key={stat.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                      <span className="text-lg">
                        {stat.type === 'behavioral' ? '💬' :
                         stat.type === 'technical' ? '💻' :
                         stat.type === 'case' ? '📊' :
                         stat.type === 'hr' ? '👥' :
                         stat.type === 'panel' ? '👔' : '📞'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white capitalize">{stat.label}</p>
                      <p className="text-sm text-slate-400">{stat.count} sessions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        'font-semibold',
                        stat.avgScore >= 80
                          ? 'text-green-500'
                          : stat.avgScore >= 60
                          ? 'text-amber-500'
                          : stat.avgScore > 0
                          ? 'text-red-500'
                          : 'text-slate-500'
                      )}
                    >
                      {stat.avgScore > 0 ? `${stat.avgScore}%` : '—'}
                    </p>
                    <p className="text-xs text-slate-500">avg score</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">
              No interview data yet
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Award className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-white">Badges</h2>
        </div>
        {badges.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center"
              >
                <span className="text-3xl">{badge.icon}</span>
                <p className="font-medium text-white mt-2">{badge.name}</p>
                <p className="text-xs text-slate-400 mt-1">{badge.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Placeholder locked badges */}
            {[
              { name: 'First Interview', icon: '🎯', desc: 'Complete your first interview' },
              { name: '5 Day Streak', icon: '🔥', desc: 'Practice 5 days in a row' },
              { name: 'Score 80+', icon: '⭐', desc: 'Get 80% or higher' },
              { name: 'Hour Master', icon: '⏱️', desc: 'Practice for 10+ hours' },
            ].map((badge) => (
              <div
                key={badge.name}
                className="rounded-lg border border-slate-700 bg-slate-800/30 p-4 text-center opacity-50"
              >
                <span className="text-3xl grayscale">{badge.icon}</span>
                <p className="font-medium text-slate-400 mt-2">{badge.name}</p>
                <p className="text-xs text-slate-500 mt-1">{badge.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  change,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: number;
  subtext?: string;
  color: 'blue' | 'purple' | 'green' | 'amber';
}): React.JSX.Element {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('rounded-lg p-2', colorClasses[color])}>
          {icon}
        </div>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-white">{value}</p>
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm',
              change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-slate-500'
            )}
          >
            {change > 0 ? (
              <ArrowUp className="h-4 w-4" />
            ) : change < 0 ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
            <span>{Math.abs(Math.round(change))}%</span>
          </div>
        )}
        {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
      </div>
    </div>
  );
}
