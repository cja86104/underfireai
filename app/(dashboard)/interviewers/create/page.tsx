import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import { CreateInterviewerForm } from './create-interviewer-form';

export const metadata: Metadata = {
  title: 'Create Custom Interviewer',
  description: 'Build a custom AI interviewer with a fully tailored personality.',
};

export default async function CreateInterviewerPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const subscription = await getSubscriptionStatus();
  const hasPurchased = subscription.hasPurchased;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/interviewers"
          className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-[#3D3229]/60 dark:text-slate-400 hover:text-[#3D3229] dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Interviewers
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3D3229] dark:text-white">
            Create Custom Interviewer
          </h1>
          <p className="text-[#3D3229]/70 dark:text-slate-400 mt-1 text-base">
            Build an interviewer with a fully custom personality, voice, and behaviour flags.
          </p>
        </div>
      </div>

      <CreateInterviewerForm hasPurchased={hasPurchased} />
    </div>
  );
}
