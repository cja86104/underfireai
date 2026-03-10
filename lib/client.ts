import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Create a Supabase client for use in the browser (Client Components)
 */
export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Singleton instance for browser client
 */
let browserClient: ReturnType<typeof createClient> | null = null;

export function getClient(): SupabaseClient<Database> {
  browserClient ??= createClient();
  return browserClient;
}

/**
 * Get current user from browser
 */
export async function getCurrentUser(): Promise<Awaited<ReturnType<ReturnType<typeof createClient>['auth']['getUser']>>['data']['user']> {
  const supabase = getClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Get current session from browser
 */
export async function getCurrentSession(): Promise<Awaited<ReturnType<ReturnType<typeof createClient>['auth']['getSession']>>['data']['session']> {
  const supabase = getClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }
  
  return session;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
): ReturnType<ReturnType<typeof createClient>['auth']['onAuthStateChange']> {
  const supabase = getClient();
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Sign out helper
 */
export async function signOut(): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw error;
  }
  
  browserClient = null;
}

/**
 * Sign in with email/password
 */
export async function signInWithEmail(email: string, password: string): Promise<Awaited<ReturnType<ReturnType<typeof createClient>['auth']['signInWithPassword']>>['data']> {
  const supabase = getClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Sign up with email/password
 */
export async function signUpWithEmail(
  email: string, 
  password: string,
  metadata?: { 
    full_name?: string;
  }
): Promise<Awaited<ReturnType<ReturnType<typeof createClient>['auth']['signUp']>>['data']> {
  const supabase = getClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/callback`,
    },
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(
  provider: 'google' | 'github'
): Promise<{ provider: string; url: string }> {
  const supabase = getClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Reset password
 */
export async function resetPassword(email: string): Promise<object> {
  const supabase = getClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<{ user: unknown }> {
  const supabase = getClient();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(metadata: Record<string, unknown>): Promise<{ user: unknown }> {
  const supabase = getClient();
  const { data, error } = await supabase.auth.updateUser({
    data: metadata,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}
