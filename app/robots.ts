import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.underfireai.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/faq',
          '/privacy',
          '/terms',
          '/login',
          '/register',
        ],
        disallow: [
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
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
