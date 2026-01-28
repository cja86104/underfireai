'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md mx-auto">
        <div className="inline-flex items-center justify-center rounded-full bg-amber-500/10 p-4 mb-6">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-slate-400 mb-6">
          We had trouble loading this page. This might be a temporary issue.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/interview/new"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Start Interview
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs text-slate-500 font-mono">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
