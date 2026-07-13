// Return types are intentionally inferred to match Supabase client types exactly
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database, Profile, Interviewer, UserResume, UserProgress } from '@/types/database';

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Singleton service-role client for server-side writes that must bypass RLS.
 * Use ONLY in Route Handlers for AI-generated content (interviewer messages,
 * session state updates). Never expose to the client or use for user-owned reads.
 */
let _adminClient: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createAdminClient(): ReturnType<typeof createSupabaseClient<Database>> {
  if (_adminClient) return _adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for admin operations',
    );
  }

  _adminClient = createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _adminClient;
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
      // @supabase/ssr's DEFAULT_COOKIE_OPTIONS ships with no `secure` flag at
      // all (audit checklist §7 finding: cookies were sent without the
      // Secure attribute, meaning they could legally be transmitted over
      // plain HTTP). The whole app already forces HTTPS everywhere (HSTS
      // with preload + `upgrade-insecure-requests` in next.config.ts), so
      // this is a pure hardening no-op in production and only needs to be
      // disabled for http://localhost in local dev. Must be kept identical
      // to the cookieOptions in middleware.ts and lib/client.ts — the
      // browser client (lib/client.ts) also writes these same cookie names
      // via document.cookie on every sign-in/sign-up/sign-out/token-refresh,
      // so a mismatched config here would just get overwritten client-side.
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
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
  /** Total interviews purchased (lifetime) */
  purchasedInterviews: number;
  /** Total interviews used (lifetime) */
  usedInterviews: number;
  /** Interviews available to use right now */
  availableInterviews: number;
  canStartInterview: boolean;
  /** True if user has ever purchased (unlocks all features) */
  hasPurchased: boolean;
}

/**
 * Check subscription/credit status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const profile = await getUserProfile();
  
  if (!profile) {
    return {
      tier: 'free',
      status: 'active',
      purchasedInterviews: 0,
      usedInterviews: 0,
      availableInterviews: 0,
      canStartInterview: false,
      hasPurchased: false,
    };
  }
  
  const purchased = profile.purchased_interviews ?? 0;
  const used = profile.interviews_used ?? 0;
  const available = Math.max(0, purchased - used);
  const hasPurchased = purchased > 0;
  
  return {
    tier: profile.subscription_tier || 'free',
    status: profile.subscription_status || 'active',
    periodEnd: profile.subscription_period_end,
    purchasedInterviews: purchased,
    usedInterviews: used,
    availableInterviews: available,
    canStartInterview: available > 0,
    hasPurchased,
  };
}
