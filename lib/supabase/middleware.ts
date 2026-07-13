import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are not configured');
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      // See matching comment in lib/supabase/server.ts (audit checklist §7
      // finding). Must stay identical to server.ts and lib/client.ts.
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    }
  );

  // If Supabase itself is unreachable (network blip, regional outage), an
  // uncaught rejection here would surface as an unhandled middleware error
  // on every single request site-wide — including public marketing pages
  // that don't need auth at all — since the matcher covers almost every
  // route. Fail closed instead: treat the request as unauthenticated. That
  // correctly bounces protected routes to /login (the safe default during
  // an outage) while public pages keep rendering normally instead of the
  // whole app 500ing until Supabase recovers.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null;
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
  } catch (error) {
    console.error('Supabase auth.getUser() failed in middleware — treating request as unauthenticated:', error);
  }

  // UnderFireAI protected routes
  const protectedRoutes = [
    '/dashboard',
    '/interview',
    '/interviewers',
    '/history',
    '/resume',
    '/resume-insights',
    '/progress',
    '/settings',
    '/negotiate',
    '/job-analysis',
  ];

  const authRoutes = ['/login', '/register', '/auth'];

  const path = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );

  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    const rawRedirect = request.nextUrl.searchParams.get('redirect');
    // Same open-redirect guard used by app/(auth)/callback/route.ts and
    // components/auth/auth-form.tsx: require a same-origin relative path,
    // reject protocol-relative URLs (//) and common bypass characters.
    // Assigning a full URL to `url.pathname` is normalised by the URL API so
    // cross-origin escape is unlikely in practice, but a whitelisted path
    // prefix is the simple, uniform rule across every redirect site.
    const safeRedirect =
      rawRedirect !== null &&
      rawRedirect.startsWith('/') &&
      !rawRedirect.startsWith('//') &&
      !/[@\\]/.test(rawRedirect)
        ? rawRedirect
        : '/dashboard';
    url.pathname = safeRedirect;
    url.searchParams.delete('redirect');
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
