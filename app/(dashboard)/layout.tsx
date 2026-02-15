import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfile, getUserProgress } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [profile, progress] = await Promise.all([
    getUserProfile(),
    getUserProgress(),
  ]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sidebar - fixed on desktop, hidden on mobile */}
      <Sidebar
        user={{
          id: user.id,
          email: user.email ?? '',
          fullName: profile?.full_name ?? null,
          avatarUrl: profile?.avatar_url ?? null,
        }}
        subscriptionTier={profile?.subscription_tier ?? 'free'}
        currentStreak={progress?.current_streak ?? 0}
      />

      {/* Main content area */}
      <div className="lg:pl-64">
        <DashboardHeader
          user={{
            email: user.email ?? '',
            fullName: profile?.full_name ?? null,
            avatarUrl: profile?.avatar_url ?? null,
          }}
        />

        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
