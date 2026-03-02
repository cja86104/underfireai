import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import {
  getCurrentUser,
  getUserInterviewers,
  getUserResume,
  getSubscriptionStatus,
  createClient,
} from '@/lib/supabase/server';
import { InterviewSetupForm } from '@/components/interview/interview-setup-form';

export const metadata: Metadata = {
  title: 'New Interview',
  description: 'Start a new mock interview session.',
};

export default async function NewInterviewPage(): Promise<React.JSX.Element> {
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

  // Fetch premium-only data for resume targeting
  let hasVulnerabilityScan = false;
  let vulnerabilityCount = 0;
  let savedJobDescriptions: {
    id: string;
    companyName: string | null;
    roleTitle: string | null;
    matchPercentage: number | null;
  }[] = [];

  if (subscription.tier === 'premium') {
    const supabase = await createClient();

    // Fetch latest vulnerability scan
    const { data: vulnScan } = await supabase
      .from('resume_insights')
      .select('vulnerabilities')
      .eq('user_id', user.id)
      .eq('insight_type', 'vulnerability')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (vulnScan?.vulnerabilities) {
      hasVulnerabilityScan = true;
      vulnerabilityCount = Array.isArray(vulnScan.vulnerabilities)
        ? vulnScan.vulnerabilities.length
        : 0;
    }

    // Fetch saved job descriptions
    const { data: jdList } = await supabase
      .from('job_descriptions')
      .select('id, company_name, role_title, match_percentage')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (jdList) {
      savedJobDescriptions = jdList.map((jd) => ({
        id: jd.id,
        companyName: jd.company_name,
        roleTitle: jd.role_title,
        matchPercentage: jd.match_percentage,
      }));
    }
  }

  return (
    <div className="w-full">
      {/* ── Resume Banner ──────────────────────────────────────────────────── */}
      {!(resume?.file_url ?? resume?.raw_text) ? (
        <Link
          href="/resume"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 px-6 py-4 mb-8 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 rounded-xl bg-amber-100 dark:bg-amber-900/50 p-2.5">
              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-300 text-sm">No resume uploaded</p>
              <p className="text-amber-700 dark:text-amber-400/80 text-sm">
                Upload your resume so the AI can tailor questions to your background
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 text-sm font-semibold text-amber-700 dark:text-amber-400 group-hover:text-amber-900 dark:group-hover:text-amber-300 transition-colors">
            Upload Resume
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-200/60 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800/40 px-6 py-4 mb-8">
          <div className="flex-shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 p-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-emerald-900 dark:text-emerald-300 text-sm">Resume loaded</p>
            <p className="text-emerald-700 dark:text-emerald-400/80 text-sm truncate">
              Your resume is ready — the AI will tailor questions to your background
            </p>
          </div>
          <Link
            href="/resume"
            className="flex-shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 transition-colors underline underline-offset-2"
          >
            Update
          </Link>
        </div>
      )}

      <div className="mb-10 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-[#3D3229] dark:text-white">Start New Interview</h1>
        <p className="text-xl text-[#3D3229] dark:text-slate-200 mt-2">
          Configure your mock interview session
        </p>
      </div>

      <InterviewSetupForm
        interviewers={interviewers}
        hasResume={!!resume}
        resumeSkills={resume?.skills ?? []}
        subscriptionTier={subscription.tier}
        voiceModeEnabled={subscription.tier !== 'free'}
        hasVulnerabilityScan={hasVulnerabilityScan}
        vulnerabilityCount={vulnerabilityCount}
        savedJobDescriptions={savedJobDescriptions}
      />
    </div>
  );
}
