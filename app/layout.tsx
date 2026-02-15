import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

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
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://underfireai.com'
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
