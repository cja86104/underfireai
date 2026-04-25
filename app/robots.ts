import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.underfireai.com';

/**
 * robots.txt configuration for UnderFireAI.
 *
 * STRUCTURE
 *   Two rule blocks:
 *     1. Wildcard '*' — applies to every crawler that does not have its own
 *        block. Disallows authenticated, API, and Next.js internal paths.
 *        Implicitly allows everything else (no `allow` array — its presence
 *        with '/' as the first entry was previously misinterpreted by some
 *        crawlers, notably Bingbot, as a closed allowlist that excluded the
 *        whole site).
 *     2. Bingbot — explicit duplicate of the wildcard rules, present because
 *        Bing's diagnostic tools flagged the wildcard-only configuration as
 *        ambiguous. Bing's webmaster guidance: "If there is no specific set
 *        of directives for the Bingbot user agent, then Bingbot honours the
 *        default set of directives defined with the wildcard user agent."
 *        Mirroring the wildcard removes that ambiguity in either direction.
 *
 * WHY NO `allow` ARRAY
 *   The previous version had `allow: ['/', '/faq', '/privacy', ...]` which,
 *   combined with the disallow list, was interpreted by some crawlers as
 *   "only these explicit paths are crawlable." Removing `allow` entirely
 *   reverts to the standard semantic: "allow everything that is not
 *   explicitly disallowed." This is the pattern recommended by Google,
 *   Bing, and the Robots Exclusion Protocol RFC 9309.
 *
 * DISALLOW LIST
 *   /dashboard       — authenticated user dashboard
 *   /interview/      — individual interview sessions (private to user)
 *   /settings        — user account settings
 *   /history         — user interview history
 *   /negotiate/      — individual negotiation sessions
 *   /interviewers    — user-created custom interviewers
 *   /job-analysis    — user job description analyses
 *   /resume          — user resume uploads and parsing
 *   /api/            — all backend API routes
 *   /_next/          — Next.js internal build artefacts
 *   /auth/           — authentication callbacks and flows
 *
 * IMPLICITLY CRAWLABLE
 *   /                — landing page
 *   /faq, /privacy,  — public marketing/legal pages
 *   /terms, /login, /register
 *   sitemap.xml      — referenced explicitly below
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    '/dashboard',
    '/interview/',
    '/settings',
    '/history',
    '/negotiate/',
    '/interviewers',
    '/job-analysis',
    '/resume',
    '/api/',
    '/_next/',
    '/auth/',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        disallow,
      },
      {
        userAgent: 'bingbot',
        disallow,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
