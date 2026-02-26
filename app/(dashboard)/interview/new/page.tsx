import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
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
