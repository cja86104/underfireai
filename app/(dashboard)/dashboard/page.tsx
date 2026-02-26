import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Flame,
  MessageSquare,
  Clock,
  TrendingUp,
  Zap,
  Target,
  ArrowRight,
  Play,
  Calendar,
} from 'lucide-react';
import {
  getUserProgress,
  getUserSessions,
  getSubscriptionStatus,
} from '@/lib/supabase/server';
import { formatDistanceToNow } from 'date-fns';
import { VulnerabilityScannerCard, ResumeHealthScore } from '@/components/resume';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your UnderFireAI interview coaching dashboard.',
};

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const [progress, sessions, subscription] = await Promise.all([
    getUserProgress(),
    getUserSessions(5),
    getSubscriptionStatus(),
  ]);

  const isPaidUser = subscription.tier !== 'free';

  const stats = [
    {
      label: 'Total Sessions',
      value: progress?.total_sessions ?? 0,
      icon: MessageSquare,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Practice Hours',
      value: `${(progress?.total_hours ?? 0).toFixed(1)}h`,
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Average Score',
      value: progress?.avg_score ? `${progress.avg_score}%` : '—',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Current Streak',
      value: `${progress?.current_streak ?? 0} days`,
      icon: Zap,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Dashboard</h1>
          <p className="text-stone-500 dark:text-slate-400 mt-1">
            Track your progress and start practicing
          </p>
        </div>
        <Link
          href="/interview/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#8B5A2B] dark:bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6B4420] dark:hover:bg-orange-600 transition-colors"
        >
          <Play className="h-4 w-4" />
          Start Interview
        </Link>
      </div>

      {/* Subscription Banner (Free users) */}
      {subscription.tier === 'free' && (
        <div className="rounded-xl border border-[#8B5A2B]/30 dark:border-orange-500/30 bg-[#8B5A2B]/10 dark:bg-orange-500/10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-[#8B5A2B]/20 dark:bg-orange-500/20 p-2">
                <Target className="h-6 w-6 text-[#8B5A2B] dark:text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900 dark:text-white">
                  {subscription.interviewsRemaining} free interviews remaining this month
                </h3>
                <p className="text-sm text-stone-500 dark:text-slate-400 mt-1">
                  Upgrade to Pro for unlimited interviews and voice mode
                </p>
              </div>
            </div>
            <Link
              href="/settings?tab=billing"
              className="inline-flex items-center gap-2 rounded-lg border border-[#8B5A2B] dark:border-orange-500 bg-transparent px-4 py-2 text-sm font-semibold text-[#8B5A2B] dark:text-orange-500 hover:bg-[#8B5A2B]/10 dark:hover:bg-orange-500/10 transition-colors"
            >
              Upgrade Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg ${stat.bgColor} p-2`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-stone-500 dark:text-slate-400">{stat.label}</p>
                <p className="text-xl font-bold text-stone-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sessions */}
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
        <div className="flex items-center justify-between p-5 border-b border-stone-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Recent Sessions</h2>
          <Link
            href="/history"
            className="text-sm text-[#8B5A2B] dark:text-orange-500 hover:text-[#6B4420] dark:hover:text-orange-400 transition-colors"
          >
            View all
          </Link>
        </div>

        {sessions && sessions.length > 0 ? (
          <div className="divide-y divide-stone-200 dark:divide-slate-800">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={session.status === 'completed'
                  ? `/interview/${session.id}/results`
                  : `/interview/${session.id}`}
                className="flex items-center gap-4 p-5 hover:bg-stone-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* Interviewer Avatar */}
                <div className="relative h-10 w-10 rounded-full bg-stone-200 dark:bg-slate-700 flex items-center justify-center text-lg overflow-hidden">
                  {session.interviewers?.avatar_url ? (
                    <Image
                      src={session.interviewers.avatar_url}
                      alt={session.interviewers.name}
                      fill
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-stone-500 dark:text-slate-400">
                      {session.interviewers?.name?.[0] || '?'}
                    </span>
                  )}
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-900 dark:text-white truncate">
                      {session.interviewers?.name || 'Unknown Interviewer'}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        session.status === 'completed'
                          ? 'status-completed'
                          : session.status === 'in_progress'
                          ? 'status-in-progress'
                          : session.status === 'paused'
                          ? 'status-paused'
                          : 'status-abandoned'
                      }`}
                    >
                      {session.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-stone-500 dark:text-slate-400">
                    <span className="capitalize">
                      {session.interview_type.replace('_', ' ')}
                    </span>
                    {session.target_role && (
                      <>
                        <span>•</span>
                        <span>{session.target_role}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Score & Time */}
                <div className="text-right">
                  {session.session_scores?.overall_score !== null &&
                  session.session_scores?.overall_score !== undefined ? (
                    <p
                      className={`text-lg font-bold ${
                        session.session_scores.overall_score >= 80
                          ? 'text-green-500'
                          : session.session_scores.overall_score >= 60
                          ? 'text-amber-500'
                          : 'text-red-500'
                      }`}
                    >
                      {session.session_scores.overall_score}%
                    </p>
                  ) : (
                    <p className="text-lg font-bold text-stone-400 dark:text-slate-500">—</p>
                  )}
                  <p className="text-xs text-stone-400 dark:text-slate-500">
                    {formatDistanceToNow(new Date(session.started_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <div className="inline-flex items-center justify-center rounded-full bg-stone-100 dark:bg-slate-800 p-4 mb-4">
              <Flame className="h-8 w-8 text-[#8B5A2B] dark:text-orange-500" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
              No interviews yet
            </h3>
            <p className="text-stone-500 dark:text-slate-400 mb-6">
              Start your first mock interview to begin tracking your progress
            </p>
            <Link
              href="/interview/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#8B5A2B] dark:bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6B4420] dark:hover:bg-orange-600 transition-colors"
            >
              <Play className="h-4 w-4" />
              Start Your First Interview
            </Link>
          </div>
        )}
      </div>

      {/* Resume Insights Section */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VulnerabilityScannerCard isPaidUser={isPaidUser} />
        </div>
        <div>
          <ResumeHealthScore isPaidUser={isPaidUser} />
        </div>
      </div>

      {/* Quick Tips */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickTipCard
          icon={<Target className="h-5 w-5" />}
          title="Use the STAR Method"
          description="Structure your answers: Situation, Task, Action, Result. This helps you give complete, compelling responses."
        />
        <QuickTipCard
          icon={<Calendar className="h-5 w-5" />}
          title="Practice Daily"
          description="Consistency beats intensity. Even one quick session per day builds confidence and keeps you sharp."
        />
        <QuickTipCard
          icon={<Flame className="h-5 w-5" />}
          title="Embrace the Unknown"
          description="Each interviewer has a hidden personality. Adapt in real-time just like you would in a real interview."
        />
      </div>
    </div>
  );
}

function QuickTipCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="rounded-lg bg-[#8B5A2B]/10 dark:bg-orange-500/10 p-2 text-[#8B5A2B] dark:text-orange-500">
          {icon}
        </div>
        <h3 className="font-medium text-stone-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-sm text-stone-500 dark:text-slate-400">{description}</p>
    </div>
  );
}
