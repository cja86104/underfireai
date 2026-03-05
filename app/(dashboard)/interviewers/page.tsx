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

  const isPremium = subscription.hasPurchased;

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
      <div>
        <h1 className="text-2xl font-bold text-[#3D3229] dark:text-white">Your Interviewers</h1>
        <p className="text-[#6B5744] dark:text-slate-400 mt-1">
          AI personalities you&apos;ve practiced with
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Generate New Interviewer */}
        <Link
          href="/interview/new"
          className="group rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6 hover:border-[#8B5A2B]/50 hover:shadow-lg hover:shadow-[#8B5A2B]/5 transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A] p-3 group-hover:scale-105 transition-transform">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#3D3229] dark:text-white mb-1">Generate New Interviewer</h3>
              <p className="text-sm text-[#6B5744] dark:text-slate-400">
                Create a fresh AI personality with hidden traits
              </p>
            </div>
          </div>
        </Link>

        {/* Create Custom Interviewer */}
        {isPremium ? (
          <Link
            href="/interviewers/create"
            className="group rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6 hover:border-[#8B5A2B]/50 hover:shadow-lg hover:shadow-[#8B5A2B]/5 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A] p-3 group-hover:scale-105 transition-transform">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#3D3229] dark:text-white mb-1">Create Custom Interviewer</h3>
                <p className="text-sm text-[#6B5744] dark:text-slate-400">
                  Hand-craft a specific personality and traits
                </p>
              </div>
            </div>
          </Link>
        ) : (
          <Link
            href="/settings?tab=billing"
            className="group rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/30 p-6 hover:border-[#8B5A2B]/30 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#3D3229]/10 dark:bg-slate-700 p-3">
                <Crown className="h-6 w-6 text-[#6B5744] dark:text-slate-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-[#3D3229] dark:text-white">Create Custom Interviewer</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#8B5A2B]/10 text-[#8B5A2B]">PRO</span>
                </div>
                <p className="text-sm text-[#6B5744] dark:text-slate-400">
                  Unlock custom interviewer creation
                </p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[#8B5A2B]/10 p-2">
            <Users className="h-5 w-5 text-[#8B5A2B]" />
          </div>
          <div>
            <h3 className="font-medium text-[#3D3229] dark:text-white">Hidden Personalities</h3>
            <p className="text-sm text-[#6B5744] dark:text-slate-400 mt-1">
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
              <h2 className="text-lg font-semibold text-[#3D3229] dark:text-white mb-4">
                {interviewTypeLabels[type] || type} Interviewers
                <span className="ml-2 text-sm font-normal text-[#6B5744] dark:text-slate-500">
                  ({typeInterviewers.length})
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {typeInterviewers.map((interviewer) => (
                  <div
                    key={interviewer.id}
                    className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 hover:border-[#8B5A2B]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="relative h-12 w-12 rounded-full bg-[#3D3229]/10 dark:bg-slate-700 flex items-center justify-center text-lg overflow-hidden">
                            {interviewer.avatar_url ? (
                              <Image
                                src={interviewer.avatar_url}
                                alt={interviewer.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <span className="text-[#6B5744] dark:text-slate-300">
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
                          <h3 className="font-medium text-[#3D3229] dark:text-white">{interviewer.name}</h3>
                          <p className="text-sm text-[#6B5744] dark:text-slate-400">
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
                        <p className="text-xs text-[#6B5744] dark:text-slate-400">Difficulty</p>
                        <p className="font-medium text-[#3D3229] dark:text-white">
                          {interviewer.difficulty_level}/10
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#FAF8F5] dark:bg-slate-800 border border-[#3D3229]/8 dark:border-slate-700 p-2">
                        <p className="text-xs text-[#6B5744] dark:text-slate-400">Style</p>
                        <p className="font-medium text-[#3D3229] dark:text-white capitalize">
                          {interviewer.company_style?.replace('_', ' ') ?? 'General'}
                        </p>
                      </div>
                    </div>

                    {/* Role focus if set */}
                    {interviewer.role_focus && (
                      <p className="text-sm text-[#6B5744] dark:text-slate-400 mb-4">
                        Focus: {interviewer.role_focus}
                      </p>
                    )}

                    {/* Action */}
                    <Link
                      href={`/interview/new?interviewer=${interviewer.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 px-4 py-2 text-sm font-medium text-[#3D3229] dark:text-slate-300 hover:bg-[#8B5A2B]/10 hover:border-[#8B5A2B]/30 hover:text-[#8B5A2B] transition-colors"
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
        <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center">
          <Users className="h-12 w-12 text-[#6B5744] dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#3D3229] dark:text-white mb-2">No interviewers yet</h3>
          <p className="text-[#6B5744] dark:text-slate-400 mb-6 max-w-md mx-auto">
            Start an interview to generate your first AI interviewer with a unique hidden personality.
          </p>
          <Link
            href="/interview/new"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] px-5 py-2.5 text-sm font-semibold text-white hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all"
          >
            <Sparkles className="h-4 w-4" />
            Generate First Interviewer
          </Link>
        </div>
      )}
    </div>
  );
}
