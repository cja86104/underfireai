import type { NextConfig } from 'next';
import type { Configuration as WebpackConfig } from 'webpack';

const supabaseHostname = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
).hostname;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three + R3F are ESM/CJS hybrids; Next.js 15 requires them transpiled.
  // gsap was already here; keeping it alongside the new entries.
  transpilePackages: ['gsap', 'three', '@react-three/fiber', '@react-three/drei'],

  // Fix pdf-parse module initialization in Next.js 15 serverless environments.
  // pdf-parse v1.x tries to read local test files at require-time; the
  // canvas alias prevents that call from erroring on Vercel/Edge runtimes.
  webpack: (config: WebpackConfig) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, unknown>),
      canvas: false as unknown as string,
    };
    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHostname,
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
