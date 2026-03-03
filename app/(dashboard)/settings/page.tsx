import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfile, getSubscriptionStatus } from '@/lib/supabase/server';
import { SettingsTabs } from '@/components/settings/settings-tabs';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings and preferences.',
};

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string; reason?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [profile, subscription] = await Promise.all([
    getUserProfile(),
    getSubscriptionStatus(),
  ]);

  const params = await searchParams;
  const activeTab = params.tab ?? 'profile';
  const reason = params.reason;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {reason === 'limit_reached' && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-amber-400 font-medium">
            You&apos;ve used all your interview credits
          </p>
          <p className="text-sm text-slate-300 mt-1">
            Purchase more credits to continue practicing.
          </p>
        </div>
      )}

      <SettingsTabs
        activeTab={activeTab}
        user={{
          id: user.id,
          email: user.email ?? '',
          fullName: profile?.full_name ?? null,
          avatarUrl: profile?.avatar_url ?? null,
        }}
        subscription={{
          tier: subscription.tier,
          status: subscription.status,
          periodEnd: subscription.periodEnd ?? null,
          interviewsRemaining: subscription.availableInterviews,
          purchasedInterviews: subscription.purchasedInterviews,
          usedInterviews: subscription.usedInterviews,
          availableInterviews: subscription.availableInterviews,
          hasPurchased: subscription.hasPurchased,
        }}
        onboardingCompleted={profile?.onboarding_completed ?? false}
      />
    </div>
  );
}
