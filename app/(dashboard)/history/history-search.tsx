'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

export function HistorySearch(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('q') || '';
  const [value, setValue] = useState(currentQuery);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) {
        router.push(`/history?q=${encodeURIComponent(trimmed)}`);
      } else {
        router.push('/history');
      }
    },
    [value, router]
  );

  const handleClear = useCallback(() => {
    setValue('');
    router.push('/history');
  }, [router]);

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by interviewer, role, company..."
        className="w-full rounded-lg border border-slate-700 bg-slate-800/50 pl-10 pr-10 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
