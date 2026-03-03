'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Flame,
  LayoutDashboard,
  MessageSquare,
  Users,
  History,
  FileText,
  BarChart3,
  Settings,
  Zap,
  Menu,
  X,
  Target,
  DollarSign,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface SidebarProps {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  hasPurchased: boolean;
  availableInterviews: number;
  currentStreak: number;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Interview', href: '/interview/new', icon: MessageSquare },
  { name: 'Interviewers', href: '/interviewers', icon: Users },
  { name: 'Create Custom', href: '/interviewers/create', icon: Wand2 },
  { name: 'Salary Negotiation', href: '/negotiate', icon: DollarSign },
  { name: 'History', href: '/history', icon: History },
  { name: 'Resume', href: '/resume', icon: FileText },
  { name: 'Job Analysis', href: '/job-analysis', icon: Target },
  { name: 'Progress', href: '/progress', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ user, hasPurchased, availableInterviews, currentStreak }: SidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 rounded-lg bg-white dark:bg-slate-800 p-2 text-[#6B5744] dark:text-slate-400 hover:text-[#3D3229] dark:hover:text-white shadow-md border border-[#3D3229]/10 dark:border-slate-700"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-[#FAF8F5] dark:bg-slate-900 border-r border-[#3D3229]/10 dark:border-slate-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-[#3D3229]/10 dark:border-slate-800">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A] rounded-lg blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A]">
                  <Flame className="h-5 w-5 text-[#3D3229] dark:text-white" />
                </div>
              </div>
              <span className="text-lg font-bold text-[#3D3229] dark:text-white">UnderFireAI</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-[#6B5744] dark:text-slate-400 hover:text-[#3D3229] dark:hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-0.5">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-[#8B5A2B]/10 dark:bg-orange-500/10 text-[#8B5A2B] dark:text-orange-500'
                          : 'text-[#6B5744] dark:text-slate-400 hover:bg-[#3D3229]/5 dark:hover:bg-slate-800 hover:text-[#3D3229] dark:hover:text-white'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1">{item.name}</span>
                      {item.name === 'New Interview' && (
                        <span className="ml-auto rounded bg-[#8B5A2B] dark:bg-orange-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                          Start
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom section */}
          <div className="border-t border-[#3D3229]/10 dark:border-slate-800 p-4 space-y-3">
            {/* Current Streak */}
            {currentStreak > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-[#8B5A2B]/8 dark:bg-slate-800/50 px-3 py-2 border border-[#8B5A2B]/15 dark:border-transparent">
                <Zap className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-xs text-[#8B7355] dark:text-slate-500">Current Streak</p>
                  <p className="text-sm font-semibold text-[#3D3229] dark:text-white">{currentStreak} days</p>
                </div>
              </div>
            )}

            {/* Interview Credits */}
            <div className="flex items-center gap-2 rounded-lg bg-[#FAF8F5] dark:bg-slate-800/50 border border-[#3D3229]/10 dark:border-transparent px-3 py-2">
              <Zap className={cn('h-5 w-5', availableInterviews > 0 ? 'text-green-500' : 'text-amber-500')} />
              <div className="flex-1">
                <p className="text-xs text-[#8B7355] dark:text-slate-500">Credits</p>
                <p className={cn('text-sm font-semibold', availableInterviews > 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400')}>
                  {availableInterviews} remaining
                </p>
              </div>
              {!hasPurchased && (
                <Link
                  href="/settings?tab=billing"
                  className="rounded-lg bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] px-2.5 py-1 text-xs font-semibold text-white hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all"
                >
                  Buy
                </Link>
              )}
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Info */}
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="relative h-8 w-8 rounded-full bg-[#8B5A2B]/15 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold text-[#8B5A2B] dark:text-white overflow-hidden">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.fullName ?? 'User'}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  (user.fullName?.[0] ?? user.email[0]).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#3D3229] dark:text-white truncate">
                  {user.fullName ?? 'User'}
                </p>
                <p className="text-xs text-[#8B7355] dark:text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
