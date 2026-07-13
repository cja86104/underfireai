import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Canonical origin for Supabase auth email callbacks (signup verification,
 * password reset).
 *
 * WHY NOT JUST window.location.origin?
 *   Under Vercel preview URLs, inside an embedded iframe, or on any
 *   non-production deployment, `window.location.origin` resolves to the
 *   environment the user happens to be browsing from. Supabase embeds that
 *   value into the verification email, so a user who signs up via a preview
 *   link ends up with an email pointing back at the preview domain — which
 *   may be gone days later when they click it.
 *
 *   NEXT_PUBLIC_APP_URL is the server-configured production domain. Every
 *   environment (dev / preview / prod) sets its own value; when set, it's
 *   the authoritative answer. We fall back to window.location.origin only
 *   when the env var is missing (true local dev without `.env.local`).
 */
function getAuthOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined') return window.location.origin;
  // Should never happen — both client-side funcs below run in the browser.
  throw new Error('No origin available: NEXT_PUBLIC_APP_URL is unset and window is unavailable');
}

/**
 * Create a Supabase client for use in the browser (Client Components)
 */
export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  // See matching comment in lib/supabase/server.ts (audit checklist §7
  // finding: cookies had no explicit `secure` flag). Must stay identical to
  // server.ts and middleware.ts — this browser client is what actually
  // writes the session cookie via document.cookie on sign-in/sign-up/
  // sign-out/token-refresh, so a mismatch here would silently overwrite
  // the server's cookieOptions on the next client-driven auth event.
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });
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
      emailRedirectTo: `${getAuthOrigin()}/callback`,
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
    redirectTo: `${getAuthOrigin()}/reset-password`,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}
