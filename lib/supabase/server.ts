// Return types are intentionally inferred to match Supabase client types exactly
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database, Profile, Interviewer, UserResume, UserProgress } from '@/types/database';

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Create a Supabase client for use in Server Components
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Get current user from server
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Get current session from server
 */
export async function getCurrentSession() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }
  
  return session;
}

/**
 * Get user profile from database
 */
export async function getUserProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return profile as Profile;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

/**
 * Get user's interviewers
 */
export async function getUserInterviewers() {
  const user = await getCurrentUser();
  
  if (!user) {
    return [];
  }
  
  const supabase = await createClient();
  const { data: interviewers, error } = await supabase
    .from('interviewers')
    .select('*')
    .eq('user_id', user.id)
    .order('total_sessions', { ascending: false });
  
  if (error) {
    console.error('Error fetching interviewers:', error);
    return [];
  }
  
  return (interviewers || []) as unknown as Interviewer[];
}

/**
 * Get a specific interviewer with personality
 */
export async function getInterviewer(interviewerId: string) {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  const supabase = await createClient();
  const { data: interviewer, error } = await supabase
    .from('interviewers')
    .select(`
      *,
      interviewer_personality (*)
    `)
    .eq('id', interviewerId)
    .eq('user_id', user.id)
    .single();
  
  if (error) {
    console.error('Error fetching interviewer:', error);
    return null;
  }
  
  return interviewer;
}

/**
 * Get interview sessions for user
 */
export async function getUserSessions(limit = 20) {
  const user = await getCurrentUser();
  
  if (!user) {
    return [];
  }
  
  const supabase = await createClient();
  const { data: sessions, error } = await supabase
    .from('interview_sessions')
    .select(`
      *,
      interviewers (id, name, avatar_url, interview_type),
      session_scores (*)
    `)
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
  
  return sessions || [];
}

/**
 * Get messages for an interview session
 */
export async function getSessionMessages(sessionId: string, limit = 100) {
  const supabase = await createClient();
  const { data: messages, error } = await supabase
    .from('interview_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  
  return messages || [];
}

/**
 * Get user's resume
 */
export async function getUserResume() {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  const supabase = await createClient();
  const { data: resume, error } = await supabase
    .from('user_resumes')
    .select('*')
    .eq('user_id', user.id)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching resume:', error);
    return null;
  }

  return resume as unknown as UserResume | null;
}

/**
 * Get user progress stats
 */
export async function getUserProgress() {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  const supabase = await createClient();
  const { data: progress, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching progress:', error);
    return null;
  }

  return progress as unknown as UserProgress | null;
}

/**
 * Subscription status response type
 */
export interface SubscriptionStatusResponse {
  tier: 'free' | 'pro' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  periodEnd?: string | null;
  interviewsRemaining?: number;
  canStartInterview: boolean;
}

/**
 * Check subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const profile = await getUserProfile();
  
  if (!profile) {
    return {
      tier: 'free',
      status: 'active',
      canStartInterview: false,
    };
  }
  
  // Free tier: 3 interviews per month
  const interviewsRemaining = profile.subscription_tier === 'free' 
    ? Math.max(0, 3 - (profile.monthly_interviews_used || 0))
    : undefined;
  
  return {
    tier: profile.subscription_tier || 'free',
    status: profile.subscription_status || 'active',
    periodEnd: profile.subscription_period_end,
    interviewsRemaining,
    canStartInterview: profile.subscription_status === 'active' && 
      (profile.subscription_tier !== 'free' || (interviewsRemaining ?? 0) > 0),
  };
}
