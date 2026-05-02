import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, Zap } from 'lucide-react';
import { getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import { JobAnalysisClient } from './job-analysis-client';

export const metadata: Metadata = {
  title: 'Job Description Analysis',
  description: 'Analyze job descriptions to identify skill gaps and get targeted practice recommendations.',
};

export default async function JobAnalysisPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const subscription = await getSubscriptionStatus();

  if (!subscription.hasPurchased) {
    return <JobAnalysisUpgradeGate />;
  }

  return <JobAnalysisClient />;
}

function JobAnalysisUpgradeGate(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#3D3229] dark:text-white">Job Description Analysis</h1>
        <p className="text-[#6B5744] dark:text-slate-400 mt-1">
          Analyze job descriptions to identify skill gaps and get targeted practice
        </p>
      </div>

      {/* Gate */}
      <div className="rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-16 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-6">
          <Lock className="h-8 w-8 text-orange-400" />
        </div>

        <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white mb-3">Purchase Required</h2>
        <p className="text-[#6B5744] dark:text-slate-300 text-base max-w-md mx-auto mb-2 leading-relaxed">
          Job Description Analysis is included with every interview credit purchase.
          Paste any job posting to instantly see how your resume stacks up, identify skill gaps, and get a targeted practice plan.
        </p>
        <p className="text-[#8B7355] dark:text-slate-500 text-sm mb-8">
          Purchase an interview pack to unlock this and all other features.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/settings?tab=billing"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-base font-semibold text-[#3D3229] dark:text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
          >
            <Zap className="h-5 w-5" />
            Get Interview Credits
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-6 py-3 text-base font-medium text-[#6B5744] dark:text-slate-300 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="mt-10 pt-8 border-t border-[#3D3229]/10 dark:border-slate-800">
          <p className="text-base font-bold text-[#3D3229] dark:text-white mb-6 text-center tracking-wide uppercase">What you get with every pack</p>
          <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto text-left">
            {[
              {
                icon: '🎯',
                title: 'Resume vs. JD Match',
                desc: 'Get a precise match score showing how well your resume aligns with any job posting — broken down by required skills, preferred qualifications, and experience level. Know immediately if you\'re a strong candidate before you even apply.',
              },
              {
                icon: '🔍',
                title: 'Skill Gap Analysis',
                desc: 'See a prioritized list of every required and preferred skill the job demands that\'s missing from your resume. No more guessing — you\'ll know exactly what to highlight, add, or practice before your interview.',
              },
              {
                icon: '⚡',
                title: 'Targeted Practice',
                desc: 'Automatically generate a custom interview session built around your specific gaps. Instead of generic questions, your interviewer will probe exactly the areas the hiring manager will focus on — so you walk in prepared.',
              },
            ].map((item) => (
              <div key={item.title} className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-[#8B5A2B]/20 dark:border-slate-700 shadow-sm flex flex-col gap-3">
                <span className="text-3xl">{item.icon}</span>
                <p className="font-bold text-[#3D3229] dark:text-white text-base">{item.title}</p>
                <p className="text-sm text-[#6B5744] dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
