'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

const GSAPProvider = dynamic(
  () => import('./animation/gsap-provider').then((mod) => mod.GSAPProvider),
  { ssr: false }
);

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): React.JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <GSAPProvider>
          {children}
        </GSAPProvider>
        <Toaster
          position="top-right"
          expand={false}
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            classNames: {
              toast: 'group toast bg-white border border-charcoal-200 text-charcoal-900',
              title: 'text-sm font-semibold',
              description: 'text-sm opacity-90',
              success: 'bg-green-50 border-green-200 text-green-900',
              error: 'bg-red-50 border-red-200 text-red-900',
              warning: 'bg-amber-50 border-amber-200 text-amber-900',
              info: 'bg-blue-50 border-blue-200 text-blue-900',
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
