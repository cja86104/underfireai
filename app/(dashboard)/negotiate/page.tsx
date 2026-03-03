import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DollarSign } from 'lucide-react';
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
  const hasPurchased = subscription.hasPurchased;

  let pastSessions: NegotiationSession[] = [];

  if (hasPurchased) {
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
    <div className="w-full">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl lg:text-4xl font-bold text-[#3D3229] dark:text-white flex items-center gap-4">
          <DollarSign className="h-10 w-10 text-orange-500" />
          Salary Negotiation Prep
        </h1>
        <p className="text-xl text-[#3D3229] dark:text-slate-200 mt-3 max-w-3xl">
          Practice negotiating your offer against a realistic AI recruiter. Get scored on confidence, framing, and strategy.
        </p>
      </div>

      <NegotiatePageClient hasPurchased={hasPurchased} pastSessions={pastSessions} />
    </div>
  );
}
