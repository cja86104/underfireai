'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  redirectTo?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

export function SearchBar({
  placeholder = 'Search interviews...',
  defaultValue = '',
  redirectTo = '/history',
  onSearch,
  className = '',
}: SearchBarProps): React.JSX.Element {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (onSearch) {
        onSearch(trimmed);
      } else if (trimmed) {
        router.push(`${redirectTo}?q=${encodeURIComponent(trimmed)}`);
      } else {
        router.push(redirectTo);
      }
    },
    [value, onSearch, redirectTo, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-64 rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 pl-10 pr-4 py-2 text-sm text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:border-[#8B5A2B] dark:focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-[#8B5A2B] dark:focus:ring-orange-500"
      />
    </form>
  );
}
