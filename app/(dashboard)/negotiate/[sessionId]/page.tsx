import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, getSubscriptionStatus, createClient } from '@/lib/supabase/server';
import { NegotiationSessionClient } from './negotiate-session-client';
import type { NegotiationSession, NegotiationMessage } from '@/types/database';

interface NegotiateSessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({ params }: NegotiateSessionPageProps): Promise<Metadata> {
  const { sessionId } = await params;
  return {
    title: 'Negotiation Session',
    description: `Salary negotiation practice session ${sessionId}`,
  };
}

export default async function NegotiateSessionPage({ params }: NegotiateSessionPageProps): Promise<React.JSX.Element> {
  const { sessionId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const subscription = await getSubscriptionStatus();

  if (subscription.tier !== 'premium') {
    redirect('/negotiate');
  }

  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from('negotiation_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) {
    notFound();
  }

  const { data: messages, error: messagesError } = await supabase
    .from('negotiation_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Error fetching negotiation messages:', messagesError);
    notFound();
  }

  return (
    <NegotiationSessionClient
      session={session as NegotiationSession}
      initialMessages={(messages ?? []) as NegotiationMessage[]}
    />
  );
}
