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
  const isPro = subscription.tier === 'pro' || subscription.tier === 'premium';

  if (!isPro) {
    return <JobAnalysisUpgradeGate />;
  }

  return <JobAnalysisClient />;
}

function JobAnalysisUpgradeGate(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Job Description Analysis</h1>
        <p className="text-slate-400 mt-1">
          Analyze job descriptions to identify skill gaps and get targeted practice
        </p>
      </div>

      {/* Gate */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-16 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-6">
          <Lock className="h-8 w-8 text-orange-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">Pro Feature</h2>
        <p className="text-slate-300 text-base max-w-md mx-auto mb-2 leading-relaxed">
          Job Description Analysis is available on Pro and Premium plans.
          Paste any job posting to instantly see how your resume stacks up, identify skill gaps, and get a targeted practice plan.
        </p>
        <p className="text-slate-500 text-sm mb-8">
          You are currently on the Free plan.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/settings?tab=billing"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
          >
            <Zap className="h-5 w-5" />
            Upgrade to Pro — $19/mo
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 bg-slate-800/50 px-6 py-3 text-base font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-800">
          <p className="text-sm font-semibold text-slate-400 mb-4">What you get with Pro</p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            {[
              { title: 'Resume vs. JD Match', desc: 'See your exact match percentage against any job posting' },
              { title: 'Skill Gap Analysis', desc: 'Know exactly which required and preferred skills you are missing' },
              { title: 'Targeted Practice', desc: 'Auto-generate a practice interview focused on your gaps' },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
