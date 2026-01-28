import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Users,
  Plus,
  MessageSquare,
  Sparkles,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { getCurrentUser, getUserInterviewers } from '@/lib/supabase/server';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = {
  title: 'Interviewers',
  description: 'Browse and manage your AI interviewers.',
};

export default async function InterviewersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const interviewers = await getUserInterviewers();

  // Group by interview type
  const groupedInterviewers = interviewers.reduce((acc, interviewer) => {
    const type = interviewer.interview_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(interviewer);
    return acc;
  }, {} as Record<string, typeof interviewers>);

  const interviewTypeLabels: Record<string, string> = {
    behavioral: 'Behavioral',
    technical: 'Technical',
    case: 'Case Study',
    hr: 'HR Screen',
    panel: 'Panel',
    phone_screen: 'Phone Screen',
  };

  const getMoodColor = (mood: string | undefined) => {
    switch (mood) {
      case 'impressed':
        return 'bg-green-500';
      case 'engaged':
        return 'bg-blue-500';
      case 'neutral':
        return 'bg-slate-500';
      case 'skeptical':
        return 'bg-amber-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Interviewers</h1>
          <p className="text-slate-400 mt-1">
            AI personalities you&apos;ve practiced with
          </p>
        </div>
        <Link
          href="/interview/new"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Generate New
        </Link>
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-medium text-white">Hidden Personalities</h3>
            <p className="text-sm text-slate-400 mt-1">
              Each interviewer has a unique personality you discover through interaction. 
              Their backstory shapes how they ask questions and what impresses them — 
              but you won&apos;t know until you&apos;re in the interview.
            </p>
          </div>
        </div>
      </div>

      {/* Interviewers Grid */}
      {interviewers.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedInterviewers).map(([type, typeInterviewers]) => (
            <div key={type}>
              <h2 className="text-lg font-semibold text-white mb-4">
                {interviewTypeLabels[type] || type} Interviewers
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({typeInterviewers.length})
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {typeInterviewers.map((interviewer) => (
                  <div
                    key={interviewer.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full bg-slate-700 flex items-center justify-center text-lg overflow-hidden">
                            {interviewer.avatar_url ? (
                              <img
                                src={interviewer.avatar_url}
                                alt={interviewer.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-slate-300">
                                {interviewer.name[0]}
                              </span>
                            )}
                          </div>
                          {/* Mood indicator */}
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900',
                              getMoodColor(interviewer.current_mood?.current)
                            )}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{interviewer.name}</h3>
                          <p className="text-sm text-slate-400">
                            {interviewer.total_sessions} sessions
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions dropdown placeholder */}
                      <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white transition-colors">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-lg bg-slate-800/50 p-2">
                        <p className="text-xs text-slate-500">Difficulty</p>
                        <p className="font-medium text-white">
                          {interviewer.difficulty_level}/10
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-800/50 p-2">
                        <p className="text-xs text-slate-500">Style</p>
                        <p className="font-medium text-white capitalize">
                          {interviewer.company_style?.replace('_', ' ') || 'General'}
                        </p>
                      </div>
                    </div>

                    {/* Role focus if set */}
                    {interviewer.role_focus && (
                      <p className="text-sm text-slate-400 mb-4">
                        Focus: {interviewer.role_focus}
                      </p>
                    )}

                    {/* Action */}
                    <Link
                      href={`/interview/new?interviewer=${interviewer.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Interview Again
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No interviewers yet</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Start an interview to generate your first AI interviewer with a unique hidden personality.
          </p>
          <Link
            href="/interview/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate First Interviewer
          </Link>
        </div>
      )}
    </div>
  );
}
