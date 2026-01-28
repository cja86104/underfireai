import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Create a Supabase client for use in the browser (Client Components)
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Singleton instance for browser client
 */
let browserClient: ReturnType<typeof createClient> | null = null;

export function getClient() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}

/**
 * Get current user from browser
 */
export async function getCurrentUser() {
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
export async function getCurrentSession() {
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
) {
  const supabase = getClient();
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Sign out helper
 */
export async function signOut() {
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
export async function signInWithEmail(email: string, password: string) {
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
) {
  const supabase = getClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
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
) {
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
export async function resetPassword(email: string) {
  const supabase = getClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
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
export async function updateUserMetadata(metadata: Record<string, unknown>) {
  const supabase = getClient();
  const { data, error } = await supabase.auth.updateUser({
    data: metadata,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}
