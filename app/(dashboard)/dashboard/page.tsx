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
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Practice Hours',
      value: `${(progress?.total_hours ?? 0).toFixed(1)}h`,
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Average Score',
      value: progress?.avg_score ? `${progress.avg_score}%` : '—',
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Current Streak',
      value: `${progress?.current_streak ?? 0} days`,
      icon: Zap,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-[#3D3229] dark:text-white">Dashboard</h1>
          <p className="text-xl text-[#3D3229] dark:text-slate-200 mt-2">
            Track your progress and start practicing
          </p>
        </div>
        <Link
          href="/interview/new"
          className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#6B4420] px-8 py-4 text-lg font-semibold text-white hover:from-[#9A6B3C] hover:to-[#7B5430] transition-all shadow-lg shadow-[#8B5A2B]/25"
        >
          <Play className="h-6 w-6" />
          Start Interview
        </Link>
      </div>

      {/* Subscription Banner (Free users) */}
      {subscription.tier === 'free' && (
        <div className="rounded-2xl border border-[#8B5A2B]/25 dark:border-orange-500/30 bg-[#8B5A2B]/8 dark:bg-orange-500/10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-start gap-5">
              <div className="rounded-xl bg-[#8B5A2B]/15 dark:bg-orange-500/20 p-3">
                <Target className="h-10 w-10 text-[#8B5A2B] dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#3D3229] dark:text-white">
                  {subscription.interviewsRemaining} free interviews remaining this month
                </h3>
                <p className="text-lg text-[#3D3229] dark:text-slate-200 mt-2">
                  Upgrade to Pro for unlimited interviews and voice mode
                </p>
              </div>
            </div>
            <Link
              href="/settings?tab=billing"
              className="inline-flex items-center gap-3 rounded-xl border-2 border-[#8B5A2B] dark:border-orange-400 bg-transparent px-6 py-3 text-lg font-semibold text-[#8B5A2B] dark:text-orange-400 hover:bg-[#8B5A2B]/10 dark:hover:bg-orange-500/10 transition-colors"
            >
              Upgrade Now
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={`rounded-xl ${stat.bgColor} p-3`}>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div>
                <p className="text-lg text-[#3D3229] dark:text-slate-200">{stat.label}</p>
                <p className="text-3xl font-bold text-[#3D3229] dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sessions */}
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-[#3D3229]/10 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Recent Sessions</h2>
          <Link
            href="/history"
            className="text-lg text-[#8B5A2B] dark:text-orange-400 hover:text-[#6B4420] dark:hover:text-orange-300 transition-colors font-semibold"
          >
            View all
          </Link>
        </div>

        {sessions && sessions.length > 0 ? (
          <div className="divide-y divide-[#3D3229]/10 dark:divide-slate-800">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={session.status === 'completed'
                  ? `/interview/${session.id}/results`
                  : `/interview/${session.id}`}
                className="flex items-center gap-5 p-6 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* Interviewer Avatar */}
                <div className="relative h-14 w-14 rounded-full bg-[#8B5A2B]/15 dark:bg-slate-700 flex items-center justify-center text-xl overflow-hidden">
                  {session.interviewers?.avatar_url ? (
                    <Image
                      src={session.interviewers.avatar_url}
                      alt={session.interviewers.name}
                      fill
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-[#8B5A2B] dark:text-slate-300 font-semibold text-lg">
                      {session.interviewers?.name?.[0] || '?'}
                    </span>
                  )}
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-semibold text-[#3D3229] dark:text-white truncate">
                      {session.interviewers?.name || 'Unknown Interviewer'}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
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
                  <div className="flex items-center gap-3 mt-2 text-lg text-[#3D3229] dark:text-slate-200">
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
                      className={`text-3xl font-bold ${
                        session.session_scores.overall_score >= 80
                          ? 'text-green-600 dark:text-green-400'
                          : session.session_scores.overall_score >= 60
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-500'
                      }`}
                    >
                      {session.session_scores.overall_score}%
                    </p>
                  ) : (
                    <p className="text-3xl font-bold text-[#8B7355] dark:text-slate-400">—</p>
                  )}
                  <p className="text-base text-[#3D3229] dark:text-slate-200 mt-1">
                    {formatDistanceToNow(new Date(session.started_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center rounded-full bg-[#8B5A2B]/10 dark:bg-slate-800 p-5 mb-6">
              <Flame className="h-12 w-12 text-[#8B5A2B] dark:text-orange-400" />
            </div>
            <h3 className="text-2xl font-bold text-[#3D3229] dark:text-white mb-3">
              No interviews yet
            </h3>
            <p className="text-xl text-[#3D3229] dark:text-slate-200 mb-8">
              Start your first mock interview to begin tracking your progress
            </p>
            <Link
              href="/interview/new"
              className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#6B4420] px-8 py-4 text-lg font-semibold text-white hover:from-[#9A6B3C] hover:to-[#7B5430] transition-all shadow-lg shadow-[#8B5A2B]/25"
            >
              <Play className="h-6 w-6" />
              Start Your First Interview
            </Link>
          </div>
        )}
      </div>

      {/* Resume Insights Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VulnerabilityScannerCard isPaidUser={isPaidUser} />
        </div>
        <div>
          <ResumeHealthScore isPaidUser={isPaidUser} />
        </div>
      </div>

      {/* Quick Tips */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <QuickTipCard
          icon={<Target className="h-8 w-8" />}
          title="Use the STAR Method"
          description="Structure your answers: Situation, Task, Action, Result. This helps you give complete, compelling responses."
        />
        <QuickTipCard
          icon={<Calendar className="h-8 w-8" />}
          title="Practice Daily"
          description="Consistency beats intensity. Even one quick session per day builds confidence and keeps you sharp."
        />
        <QuickTipCard
          icon={<Flame className="h-8 w-8" />}
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
    <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="rounded-xl bg-[#8B5A2B]/10 dark:bg-orange-500/10 p-3 text-[#8B5A2B] dark:text-orange-400">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-[#3D3229] dark:text-white">{title}</h3>
      </div>
      <p className="text-lg text-[#3D3229] dark:text-slate-200">{description}</p>
    </div>
  );
}
