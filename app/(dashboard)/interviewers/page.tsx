import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Users,
  MessageSquare,
  Sparkles,
  Crown,
  Wand2,
} from 'lucide-react';
import { getCurrentUser, getUserInterviewers, getSubscriptionStatus } from '@/lib/supabase/server';
import { InterviewerActions } from '@/components/interviewer/InterviewerActions';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = {
  title: 'Interviewers',
  description: 'Browse and manage your AI interviewers.',
};

export default async function InterviewersPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [interviewers, subscription] = await Promise.all([
    getUserInterviewers(),
    getSubscriptionStatus(),
  ]);

  const isPremium = subscription.tier === 'premium';

  // Group by interview type
  const groupedInterviewers = interviewers.reduce<Record<string, typeof interviewers>>((acc, interviewer) => {
    const type = interviewer.interview_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(interviewer);
    return acc;
  }, {});

  const interviewTypeLabels: Record<string, string> = {
    behavioral: 'Behavioral',
    technical: 'Technical',
    case: 'Case Study',
    hr: 'HR Screen',
    panel: 'Panel',
    phone_screen: 'Phone Screen',
  };

  const getMoodColor = (mood: string | undefined): string => {
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
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Your Interviewers</h1>
          <p className="text-stone-500 dark:text-slate-400 mt-1">
            AI personalities you&apos;ve practiced with
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isPremium ? (
            <Link
              href="/interviewers/create"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-[#3D3229] dark:text-white hover:bg-amber-600 transition-colors"
            >
              <Wand2 className="h-4 w-4" />
              Create Custom
            </Link>
          ) : (
            <Link
              href="/settings?tab=billing"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <Crown className="h-4 w-4" />
              Create Custom
            </Link>
          )}
          <Link
            href="/interview/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#8B5A2B] dark:bg-orange-500 px-4 py-2 text-sm font-semibold text-[#3D3229] dark:text-white hover:bg-[#6B4420] dark:hover:bg-orange-600 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate New
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-medium text-stone-900 dark:text-white">Hidden Personalities</h3>
            <p className="text-sm text-stone-500 dark:text-slate-400 mt-1">
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
              <h2 className="text-lg font-semibold text-stone-900 dark:text-white mb-4">
                {interviewTypeLabels[type] || type} Interviewers
                <span className="ml-2 text-sm font-normal text-stone-400 dark:text-slate-500">
                  ({typeInterviewers.length})
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {typeInterviewers.map((interviewer) => (
                  <div
                    key={interviewer.id}
                    className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 hover:border-stone-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="relative h-12 w-12 rounded-full bg-stone-200 dark:bg-slate-700 flex items-center justify-center text-lg overflow-hidden">
                            {interviewer.avatar_url ? (
                              <Image
                                src={interviewer.avatar_url}
                                alt={interviewer.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <span className="text-stone-600 dark:text-slate-300">
                                {interviewer.name[0]}
                              </span>
                            )}
                          </div>
                          {/* Mood indicator */}
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900',
                              getMoodColor(interviewer.current_mood?.current)
                            )}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-stone-900 dark:text-white">{interviewer.name}</h3>
                          <p className="text-sm text-stone-500 dark:text-slate-400">
                            {interviewer.total_sessions} sessions
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions dropdown */}
                      <InterviewerActions
                        interviewerId={interviewer.id}
                        interviewerName={interviewer.name}
                        isCustom={true}
                      />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-lg bg-[#FAF8F5] dark:bg-slate-800 border border-[#3D3229]/8 dark:border-slate-700 p-2">
                        <p className="text-xs text-[#8B7355] dark:text-slate-400">Difficulty</p>
                        <p className="font-medium text-[#3D3229] dark:text-white">
                          {interviewer.difficulty_level}/10
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#FAF8F5] dark:bg-slate-800 border border-[#3D3229]/8 dark:border-slate-700 p-2">
                        <p className="text-xs text-[#8B7355] dark:text-slate-400">Style</p>
                        <p className="font-medium text-[#3D3229] dark:text-white capitalize">
                          {interviewer.company_style?.replace('_', ' ') ?? 'General'}
                        </p>
                      </div>
                    </div>

                    {/* Role focus if set */}
                    {interviewer.role_focus && (
                      <p className="text-sm text-stone-500 dark:text-slate-400 mb-4">
                        Focus: {interviewer.role_focus}
                      </p>
                    )}

                    {/* Action */}
                    <Link
                      href={`/interview/new?interviewer=${interviewer.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 px-4 py-2 text-sm font-medium text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 hover:text-stone-900 dark:hover:text-white transition-colors"
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
        <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center">
          <Users className="h-12 w-12 text-[#8B7355] dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">No interviewers yet</h3>
          <p className="text-stone-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Start an interview to generate your first AI interviewer with a unique hidden personality.
          </p>
          <Link
            href="/interview/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#8B5A2B] dark:bg-orange-500 px-4 py-2 text-sm font-semibold text-[#3D3229] dark:text-white hover:bg-[#6B4420] dark:hover:bg-orange-600 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate First Interviewer
          </Link>
        </div>
      )}
    </div>
  );
}
