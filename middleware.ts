import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest): Promise<Response> {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match every request path EXCEPT:
     *   - _next/static, _next/image, favicon.ico    — framework-served assets
     *   - Static image extensions                   — served directly
     *   - /api/stripe/webhook                       — Stripe sends no cookies;
     *                                                 running updateSession here
     *                                                 would pointlessly call
     *                                                 auth.getUser() and risk
     *                                                 mutating headers on a
     *                                                 response Stripe does not
     *                                                 read.
     *
     * DELIBERATELY INCLUDED (was previously excluded):
     *   - /api/webhooks/**  — user-facing CRUD for outbound webhook configs
     *     (list / create / update / delete / fire test delivery). These are
     *     authenticated endpoints that SHOULD have their Supabase session
     *     refreshed like any other protected API route. The earlier
     *     `api/webhooks` exclusion was a footgun: it blocked middleware on
     *     every route in app/api/webhooks/** because the pattern matches any
     *     path beginning with that prefix, not only an inbound receiver.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/stripe/webhook).*)',
  ],
};
