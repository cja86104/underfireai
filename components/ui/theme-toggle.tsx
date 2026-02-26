'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ThemeToggleProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function ThemeToggle({ className, variant = 'default' }: ThemeToggleProps): React.JSX.Element | null {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = theme === 'dark';

  if (variant === 'compact') {
    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={cn(
          'p-2 rounded-lg transition-colors',
          'bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700',
          'text-stone-600 dark:text-slate-400',
          className
        )}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        'bg-stone-100 dark:bg-slate-800/50 hover:bg-stone-200 dark:hover:bg-slate-800',
        'text-stone-700 dark:text-slate-400',
        className
      )}
    >
      {isDark ? (
        <>
          <Sun className="h-5 w-5" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="h-5 w-5" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
}
