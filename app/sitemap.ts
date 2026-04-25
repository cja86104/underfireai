import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.underfireai.com';

/**
 * UnderFireAI public sitemap.
 *
 * INCLUDED
 *   Public marketing surface that Google should crawl and rank:
 *     - landing (priority 1.0, highest signal)
 *     - faq (priority 0.8, high content value)
 *     - privacy, terms (priority 0.3, required-but-low-priority pages)
 *
 * REMOVED
 *   /login and /register were previously listed here with priority 0.5
 *   and 0.6 respectively. Both are now covered by the noindex directive
 *   in app/(auth)/layout.tsx — telling Google not to index a page while
 *   simultaneously listing it in the sitemap is contradictory and wastes
 *   crawl budget on pages that will never rank. Users wanting to bookmark
 *   /login or /register can do so directly without the URLs needing to
 *   appear in any sitemap.
 *
 * NOT YET LISTED
 *   When public marketing surface expands (a /pricing page, a /blog
 *   section, a /case-studies page), add entries here. New routes won't
 *   be discovered by Google as quickly via internal linking alone.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
