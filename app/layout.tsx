import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Canonical site URL.
 *
 * Used as the metadataBase fallback for Next.js Metadata API. MUST match
 * the BASE_URL constants used in app/robots.ts and app/sitemap.ts so that
 * crawlers see one consistent canonical host across robots.txt,
 * sitemap.xml, OpenGraph tags, and canonical link headers.
 *
 * The www subdomain is the canonical host because:
 *   - DNS records currently point www → Vercel (apex redirects to www)
 *   - sitemap.ts and robots.ts already use the www form
 *   - Google treats www and apex as separate properties for indexing
 *     signals; consistency avoids fragmenting that authority
 *
 * Previously the metadataBase fallback was `https://underfireai.com`
 * (apex) while robots.ts and sitemap.ts used `https://www.underfireai.com`
 * (www). When NEXT_PUBLIC_APP_URL is unset, OpenGraph URLs and canonical
 * link headers would point at the apex while sitemaps pointed at www —
 * which crawlers can interpret as duplicate content split across two
 * canonical hosts. Aligned to www across the board.
 */
const SITE_URL = 'https://www.underfireai.com';

export const metadata: Metadata = {
  title: {
    default: 'UnderFireAI - Train Under Fire. So the real thing feels easy.',
    template: '%s | UnderFireAI',
  },
  description:
    'AI-powered interview coaching with hidden interviewer personalities. Practice with realistic, unpredictable mock interviews that prepare you for anything.',
  keywords: [
    'interview prep',
    'mock interview',
    'AI interview coach',
    'job interview practice',
    'behavioral interview',
    'technical interview',
    'STAR method',
    'interview training',
  ],
  authors: [{ name: 'UnderFireAI' }],
  creator: 'UnderFireAI',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL
  ),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'UnderFireAI - Train Under Fire. So the real thing feels easy.',
    description:
      'AI-powered interview coaching with hidden interviewer personalities. Practice with realistic, unpredictable mock interviews.',
    siteName: 'UnderFireAI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UnderFireAI - Train Under Fire. So the real thing feels easy.',
    description:
      'AI-powered interview coaching with hidden interviewer personalities.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

/**
 * Site-wide JSON-LD structured data, server-rendered into every page's
 * <body>. Two schemas wrapped in a @graph array:
 *
 *   1. Organization — declares the brand, logo, and identity. This is
 *      what powers Knowledge Graph entries and brand-card results in
 *      Google search.
 *
 *   2. SoftwareApplication — declares the product, target audience, and
 *      category. Used by Google to surface the brand in interview-prep
 *      and career-tool vertical searches, and to enable rich-result
 *      eligibility (app rating, screenshot carousels, etc., once those
 *      are added).
 *
 * The two schemas share an @id reference so Google understands them as
 * facets of the same entity rather than two separate things.
 *
 * Why in the root layout vs the landing page:
 *   The landing page (app/page.tsx) is a 'use client' component and
 *   cannot export metadata or render JSON-LD without converting it to a
 *   server wrapper or splitting it into separate files. Site-wide JSON-LD
 *   in the root layout is the more common pattern anyway — every page
 *   reinforces the same brand entity to crawlers, which strengthens the
 *   overall brand authority signal.
 *
 * Why dangerouslySetInnerHTML:
 *   This is the documented Next.js pattern for JSON-LD. Payload is a
 *   server-controlled static object literal — no user input, no XSS
 *   vector. See https://nextjs.org/docs/app/guides/json-ld for the
 *   official recommendation.
 *
 * If a public pricing/checkout page or trial offer is ever published, add
 * an `offers` block to the SoftwareApplication schema with
 * price/priceCurrency/availability. Without that block Google will not
 * display price-related rich snippets, which is correct behavior until
 * pricing is publicly published.
 */
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'UnderFireAI',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/og-image.png`,
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'UnderFireAI',
      url: SITE_URL,
      description:
        'AI-powered interview coaching with hidden interviewer personalities. Practice realistic, unpredictable mock interviews with real-time STAR method analysis, voice-based conversations, and deep performance analytics.',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      audience: {
        '@type': 'Audience',
        audienceType: 'Job seekers and interview candidates',
      },
      publisher: {
        '@id': `${SITE_URL}/#organization`,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- JSON-LD structured data is a documented Next.js pattern; payload is a static, server-controlled object literal with no user input. See https://nextjs.org/docs/app/guides/json-ld
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
