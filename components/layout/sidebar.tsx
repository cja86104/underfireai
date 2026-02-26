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
  Crown,
  Zap,
  Menu,
  X,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SidebarProps {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  subscriptionTier: 'free' | 'pro' | 'premium';
  currentStreak: number;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Interview', href: '/interview/new', icon: MessageSquare },
  { name: 'Interviewers', href: '/interviewers', icon: Users },
  { name: 'History', href: '/history', icon: History },
  { name: 'Resume', href: '/resume', icon: FileText },
  { name: 'Job Analysis', href: '/job-analysis', icon: Target },
  { name: 'Progress', href: '/progress', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ user, subscriptionTier, currentStreak }: SidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const tierColors = {
    free: 'text-slate-400',
    pro: 'text-orange-500',
    premium: 'text-amber-400',
  };

  const tierLabels = {
    free: 'Free',
    pro: 'Pro',
    premium: 'Premium',
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white"
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
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Flame className="h-8 w-8 text-orange-500" />
              <span className="text-xl font-bold text-white">UnderFireAI</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-orange-500/10 text-orange-500'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                      {item.name === 'New Interview' && (
                        <span className="ml-auto rounded bg-orange-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                          Start
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Streak & Tier */}
          <div className="border-t border-slate-800 p-4 space-y-3">
            {/* Current Streak */}
            {currentStreak > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
                <Zap className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-xs text-slate-500">Current Streak</p>
                  <p className="text-sm font-semibold text-white">{currentStreak} days</p>
                </div>
              </div>
            )}

            {/* Subscription Tier */}
            <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
              <Crown className={cn('h-5 w-5', tierColors[subscriptionTier])} />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Plan</p>
                <p className={cn('text-sm font-semibold', tierColors[subscriptionTier])}>
                  {tierLabels[subscriptionTier]}
                </p>
              </div>
              {subscriptionTier === 'free' && (
                <Link
                  href="/settings?tab=billing"
                  className="rounded bg-orange-500 px-2 py-1 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
                >
                  Upgrade
                </Link>
              )}
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="relative h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-white overflow-hidden">
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
                <p className="text-sm font-medium text-white truncate">
                  {user.fullName ?? 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
