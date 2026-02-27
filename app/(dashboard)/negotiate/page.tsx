import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DollarSign, Crown } from 'lucide-react';
import { getCurrentUser, getSubscriptionStatus, createClient } from '@/lib/supabase/server';
import { NegotiatePageClient } from './negotiate-page-client';
import type { NegotiationSession } from '@/types/database';

export const metadata: Metadata = {
  title: 'Salary Negotiation Prep',
  description: 'Practice salary negotiation against an AI recruiter and get scored feedback.',
};

export default async function NegotiatePage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const subscription = await getSubscriptionStatus();
  const isPremium = subscription.tier === 'premium';

  let pastSessions: NegotiationSession[] = [];

  if (isPremium) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('negotiation_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(20);

    pastSessions = (data ?? []) as NegotiationSession[];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3D3229] dark:text-white flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-orange-400" />
            Salary Negotiation Prep
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
              <Crown className="h-3 w-3" />
              Premium
            </span>
          </h1>
          <p className="text-[#3D3229]/70 dark:text-slate-400 mt-1 text-base">
            Practice negotiating your offer against a realistic AI recruiter. Get scored on confidence, framing, and strategy.
          </p>
        </div>
      </div>

      <NegotiatePageClient isPremium={isPremium} pastSessions={pastSessions} />
    </div>
  );
}
