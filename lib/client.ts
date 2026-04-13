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
