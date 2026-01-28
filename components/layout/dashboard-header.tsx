'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  LogOut,
  Settings,
  User,
  ChevronDown,
} from 'lucide-react';
import { signOut } from '@/lib/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

interface DashboardHeaderProps {
  user: {
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      toast.success('Signed out successfully');
      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error('Failed to sign out');
    } finally {
      setIsSigningOut(false);
      setDropdownOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side - Search (placeholder for mobile menu space) */}
        <div className="flex items-center gap-4 lg:pl-0 pl-12">
          <div className="hidden sm:block relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search interviews..."
              className="w-64 rounded-lg border border-slate-700 bg-slate-800/50 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Bell className="h-5 w-5" />
            {/* Notification dot */}
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500" />
          </button>

          {/* User dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-800 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-white overflow-hidden">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName || 'User'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (user.fullName?.[0] || user.email[0]).toUpperCase()
                )}
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform',
                  dropdownOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-lg z-20">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-700">
                    <p className="text-sm font-medium text-white truncate">
                      {user.fullName || 'User'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </div>

                  {/* Sign out */}
                  <div className="border-t border-slate-700 py-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {isSigningOut ? 'Signing out...' : 'Sign out'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
