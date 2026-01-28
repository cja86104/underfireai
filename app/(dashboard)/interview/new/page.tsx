import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  getCurrentUser,
  getUserInterviewers,
  getUserResume,
  getSubscriptionStatus,
} from '@/lib/supabase/server';
import { InterviewSetupForm } from '@/components/interview/interview-setup-form';

export const metadata: Metadata = {
  title: 'New Interview',
  description: 'Start a new mock interview session.',
};

export default async function NewInterviewPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [interviewers, resume, subscription] = await Promise.all([
    getUserInterviewers(),
    getUserResume(),
    getSubscriptionStatus(),
  ]);

  // Check if user can start an interview
  if (!subscription.canStartInterview) {
    redirect('/settings?tab=billing&reason=limit_reached');
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Start New Interview</h1>
        <p className="text-slate-400 mt-1">
          Configure your mock interview session
        </p>
      </div>

      <InterviewSetupForm
        interviewers={interviewers}
        hasResume={!!resume}
        resumeSkills={resume?.skills || []}
        subscriptionTier={subscription.tier}
        voiceModeEnabled={subscription.tier !== 'free'}
      />
    </div>
  );
}
