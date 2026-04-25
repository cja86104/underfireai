import type { Metadata } from 'next';

/**
 * Shared layout for all authentication routes.
 *
 * Covers: /login, /register, /forgot-password, /reset-password, /callback
 *
 * SEO POSTURE: noindex
 *   Auth pages are functional, not informational. They have no value as
 *   search results — anyone landing on /login from Google search has
 *   already bypassed the marketing context that explains what the
 *   product is. Login pages also tend to outrank the landing page on
 *   branded queries because they accumulate inbound links faster (every
 *   "Sign In" link in marketing materials, footers, embeds, and bookmarks
 *   counts as a link signal). The combination is bad: login wins on
 *   branded search → user lands on a login form → user bounces because
 *   they don't know what they're being asked to log into.
 *
 *   Setting `robots: { index: false, follow: true }` on this layout tells
 *   Google to drop every auth route from its search index while
 *   continuing to follow links on those pages (the "Back to home" link,
 *   the "Don't have an account? Sign up" link, etc.). That preserves
 *   internal PageRank flow without the auth pages themselves appearing
 *   in results. Bookmarking still works for users — that path is purely
 *   about search visibility.
 *
 * WHY A LAYOUT INSTEAD OF PER-PAGE METADATA
 *   Two of the five auth pages (/forgot-password, /reset-password) are
 *   'use client' components, which cannot export `metadata` directly.
 *   /callback is also typically a server-side handler that doesn't have
 *   a page metadata block. Putting the noindex directive in the shared
 *   route-group layout applies it uniformly to all five routes with
 *   zero per-page maintenance.
 *
 *   Per-page titles and descriptions are still set on the individual
 *   pages where appropriate (e.g., login/page.tsx still sets its own
 *   title). This layout adds robots directives without touching titles.
 *
 * SITEMAP COORDINATION
 *   Auth routes are also removed from app/sitemap.ts in the parallel
 *   change — there is no point asking Google to crawl pages we
 *   immediately tell it not to index.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
