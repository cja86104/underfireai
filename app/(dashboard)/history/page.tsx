import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import {
  Clock,
  Calendar,
  TrendingUp,
  ChevronRight,
  MessageSquare,
  Search,
} from 'lucide-react';
import { getCurrentUser, getUserSessions } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { cn } from '@/lib/utils/cn';
import { HistorySearch } from './history-search';

export const metadata: Metadata = {
  title: 'Interview History',
  description: 'View your past interview sessions and scores.',
};

interface HistoryPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { q: searchQuery } = await searchParams;
  const allSessions = await getUserSessions(50);

  const sessions = searchQuery
    ? allSessions.filter((session) => {
        const query = searchQuery.toLowerCase();
        return (
          session.interviewers?.name?.toLowerCase().includes(query) ||
          session.interview_type?.toLowerCase().includes(query) ||
          session.target_role?.toLowerCase().includes(query) ||
          session.target_company?.toLowerCase().includes(query)
        );
      })
    : allSessions;

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const totalDuration = completedSessions.reduce(
    (acc, s) => acc + (s.duration_seconds ?? 0),
    0
  );
  const avgScore =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce(
            (acc, s) => acc + (s.session_scores?.overall_score ?? 0),
            0
          ) / (completedSessions.filter((s) => s.session_scores?.overall_score != null).length || 1)
        )
      : 0;

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3D3229] dark:text-white">Interview History</h1>
          <p className="text-[#6B5744] dark:text-slate-400 mt-1">
            Review your past sessions and track improvement
          </p>
        </div>
        <Link
          href="/interview/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] px-4 py-2.5 text-sm font-semibold text-[#3D3229] dark:text-white hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all shadow-lg shadow-[#8B5A2B]/20"
        >
          <MessageSquare className="h-4 w-4" />
          New Interview
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-[#6B5744] dark:text-slate-400">Total Sessions</p>
              <p className="text-xl font-bold text-[#3D3229] dark:text-white">{sessions.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-[#6B5744] dark:text-slate-400">Total Time</p>
              <p className="text-xl font-bold text-[#3D3229] dark:text-white">{formatDuration(totalDuration)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-500" />
            </div>
            <div>
              <p className="text-sm text-[#6B5744] dark:text-slate-400">Average Score</p>
              <p className="text-xl font-bold text-[#3D3229] dark:text-white">
                {avgScore > 0 ? `${avgScore}%` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#3D3229]/8 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Suspense
              fallback={
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7355] dark:text-slate-500" />
                  <div className="w-full rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-800/50 pl-10 pr-4 py-2 text-sm text-[#8B7355] dark:text-slate-500">
                    Search by interviewer, role, company...
                  </div>
                </div>
              }
            >
              <HistorySearch />
            </Suspense>
            {searchQuery && (
              <span className="text-sm text-[#6B5744] dark:text-slate-400">
                {sessions.length} result{sessions.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
              </span>
            )}
          </div>
        </div>

        {sessions.length > 0 ? (
          <div className="divide-y divide-[#3D3229]/8 dark:divide-slate-800">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={
                  session.status === 'completed'
                    ? `/interview/${session.id}/results`
                    : `/interview/${session.id}`
                }
                className="flex items-center gap-4 p-4 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* Interviewer Avatar */}
                <div className="relative h-12 w-12 rounded-full bg-[#8B5A2B]/12 dark:bg-slate-700 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                  {session.interviewers?.avatar_url ? (
                    <Image
                      src={session.interviewers.avatar_url}
                      alt={session.interviewers.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-[#8B5A2B] dark:text-slate-400 font-semibold text-sm">
                      {session.interviewers?.name?.[0] || '?'}
                    </span>
                  )}
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-[#3D3229] dark:text-white truncate">
                      {session.interviewers?.name || 'Unknown Interviewer'}
                    </p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        session.status === 'completed'
                          ? 'status-completed'
                          : session.status === 'in_progress'
                          ? 'status-in-progress'
                          : session.status === 'paused'
                          ? 'status-paused'
                          : 'status-abandoned'
                      )}
                    >
                      {session.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#6B5744] dark:text-slate-400">
                    <span className="capitalize">
                      {session.interview_type.replace('_', ' ')}
                    </span>
                    {session.target_role && (
                      <>
                        <span>•</span>
                        <span className="truncate">{session.target_role}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>Difficulty {session.difficulty}/10</span>
                  </div>
                </div>

                {/* Score & Date */}
                <div className="text-right flex-shrink-0">
                  {session.session_scores?.overall_score !== null &&
                  session.session_scores?.overall_score !== undefined ? (
                    <p
                      className={cn(
                        'text-lg font-bold',
                        session.session_scores.overall_score >= 80
                          ? 'text-green-600 dark:text-green-500'
                          : session.session_scores.overall_score >= 60
                          ? 'text-amber-600 dark:text-amber-500'
                          : 'text-red-500'
                      )}
                    >
                      {session.session_scores.overall_score}%
                    </p>
                  ) : (
                    <p className="text-lg font-bold text-[#8B7355] dark:text-slate-500">—</p>
                  )}
                  <p className="text-xs text-[#8B7355] dark:text-slate-500">
                    {format(new Date(session.started_at), 'MMM d, yyyy')}
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 text-[#8B7355] dark:text-slate-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center rounded-full bg-[#8B5A2B]/10 dark:bg-slate-800 p-4 mb-4">
              <MessageSquare className="h-12 w-12 text-[#8B5A2B] dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#3D3229] dark:text-white mb-2">No interviews yet</h3>
            <p className="text-[#6B5744] dark:text-slate-400 mb-6">
              Start practicing to build your interview history
            </p>
            <Link
              href="/interview/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] px-5 py-2.5 text-sm font-semibold text-[#3D3229] dark:text-white hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all shadow-lg shadow-[#8B5A2B]/20"
            >
              Start Your First Interview
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
