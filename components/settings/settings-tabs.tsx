'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  CreditCard,
  Bell,
  Shield,
  Loader2,
  Check,
  Crown,
  Globe,
  Sparkles,
  Zap,
  Package,
  Plus,
} from 'lucide-react';
import { WebhooksTab } from './webhooks-tab';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { getClient } from '@/lib/client';
import { INTERVIEW_PRODUCT_CONFIG, type InterviewProduct } from '@/types/database';

interface SettingsTabsProps {
  activeTab: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  subscription: {
    tier: 'free' | 'pro' | 'premium';
    status: string;
    periodEnd: string | null;
    /** @deprecated Use availableInterviews instead */
    interviewsRemaining?: number;
    purchasedInterviews: number;
    usedInterviews: number;
    availableInterviews: number;
    hasPurchased: boolean;
  };
  onboardingCompleted: boolean;
}

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'billing', label: 'Credits', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'webhooks', label: 'Webhooks', icon: Globe },
];

export function SettingsTabs({
  activeTab,
  user,
  subscription,
}: SettingsTabsProps): React.JSX.Element {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState(activeTab);

  const handleTabChange = (tabId: string): void => {
    setCurrentTab(tabId);
    router.push(`/settings?tab=${tabId}`, { scroll: false });
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-lg bg-[#3D3229]/5 dark:bg-slate-800/50 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center',
              currentTab === tab.id
                ? 'bg-[#3D3229]/10 dark:bg-slate-700 text-[#3D3229] dark:text-white'
                : 'text-[#6B5744] dark:text-slate-400 hover:text-[#3D3229] dark:hover:text-white'
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {currentTab === 'profile' && (
          <ProfileTab user={user} />
        )}
        {currentTab === 'billing' && (
          <BillingTab subscription={subscription} />
        )}
        {currentTab === 'notifications' && (
          <NotificationsTab />
        )}
        {currentTab === 'security' && (
          <SecurityTab email={user.email} />
        )}
        {currentTab === 'webhooks' && (
          <WebhooksTab />
        )}
      </div>
    </div>
  );
}

function ProfileTab({ user }: { user: SettingsTabsProps['user'] }): React.JSX.Element {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user.fullName ?? '',
  });

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = getClient();
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: formData.fullName })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated!');
      router.refresh();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
      <h2 className="text-lg font-semibold text-[#3D3229] dark:text-white mb-6">Profile Information</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#6B5744] dark:text-slate-300 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user.email}
            disabled
            className="w-full rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-[#3D3229]/3 dark:bg-slate-800/30 px-4 py-2.5 text-[#6B5744] dark:text-slate-400 cursor-not-allowed"
          />
          <p className="text-xs text-[#8B7355] dark:text-slate-500 mt-1">
            Email cannot be changed
          </p>
        </div>

        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-[#6B5744] dark:text-slate-300 mb-1.5">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Your name"
            className="w-full rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-[#3D3229]/5 dark:bg-slate-800/50 px-4 py-2.5 text-[#3D3229] dark:text-slate-900 dark:text-slate-100 placeholder:text-[#8B7355] dark:placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-[#3D3229] dark:text-white hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function BillingTab({ subscription }: { subscription: SettingsTabsProps['subscription'] }): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<InterviewProduct | null>(null);

  const handlePurchase = async (product: InterviewProduct): Promise<void> => {
    setIsLoading(product);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });

      if (!response.ok) {
        const error = await response.json() as { message?: string };
        throw new Error(error.message ?? 'Failed to create checkout session');
      }

      const data = await response.json() as { url: string };
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(null);
    }
  };

  const products = [
    {
      key: 'starter_6' as const,
      ...INTERVIEW_PRODUCT_CONFIG.starter_6,
      icon: Package,
      color: 'blue',
      popular: false,
    },
    {
      key: 'pro_11' as const,
      ...INTERVIEW_PRODUCT_CONFIG.pro_11,
      icon: Sparkles,
      color: 'orange',
      popular: true,
    },
  ];

  const refillProduct = {
    key: 'refill_5' as const,
    ...INTERVIEW_PRODUCT_CONFIG.refill_5,
    icon: Plus,
    color: 'green',
  };

  return (
    <div className="space-y-6">
      {/* Current Credits */}
      <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-[#3D3229] dark:text-white mb-4">Interview Credits</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'rounded-xl p-3',
              subscription.availableInterviews > 0 ? 'bg-green-500/10' : 'bg-amber-500/10'
            )}>
              <Zap className={cn(
                'h-8 w-8',
                subscription.availableInterviews > 0 ? 'text-green-500' : 'text-amber-500'
              )} />
            </div>
            <div>
              <p className="text-3xl font-bold text-[#3D3229] dark:text-white">
                {subscription.availableInterviews}
                <span className="text-lg font-normal text-[#6B5744] dark:text-slate-400 ml-2">
                  interviews remaining
                </span>
              </p>
              <p className="text-sm text-[#6B5744] dark:text-slate-400 mt-1">
                {subscription.purchasedInterviews} purchased • {subscription.usedInterviews} used
              </p>
            </div>
          </div>
          {subscription.hasPurchased && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Crown className="h-5 w-5" />
              <span className="text-sm font-medium">All features unlocked</span>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Options */}
      <div>
        <h2 className="text-lg font-semibold text-[#3D3229] dark:text-white mb-4">
          {subscription.hasPurchased ? 'Buy More Credits' : 'Get Started'}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <div
              key={product.key}
              className={cn(
                'rounded-xl border p-6 relative',
                product.popular
                  ? 'border-orange-500 bg-orange-500/5'
                  : 'border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50'
              )}
            >
              {product.popular && (
                <span className="absolute -top-3 left-4 inline-block rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                  Best Value
                </span>
              )}
              <div className="flex items-start gap-4">
                <div className={cn(
                  'rounded-xl p-3',
                  product.color === 'orange' ? 'bg-orange-500/10' : 'bg-blue-500/10'
                )}>
                  <product.icon className={cn(
                    'h-6 w-6',
                    product.color === 'orange' ? 'text-orange-500' : 'text-blue-500'
                  )} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#3D3229] dark:text-white">
                    {product.label}
                  </h3>
                  <p className="text-sm text-[#6B5744] dark:text-slate-400 mt-1">
                    {product.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#3D3229] dark:text-white">
                    {product.priceDisplay}
                  </p>
                  <p className="text-xs text-[#6B5744] dark:text-slate-400">
                    one-time
                  </p>
                </div>
              </div>
              
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-[#6B5744] dark:text-slate-300">
                  <Check className="h-4 w-4 text-green-500" />
                  {product.interviews} AI mock interviews
                </li>
                <li className="flex items-center gap-2 text-sm text-[#6B5744] dark:text-slate-300">
                  <Check className="h-4 w-4 text-green-500" />
                  All interview types (behavioral, technical, panel, etc.)
                </li>
                <li className="flex items-center gap-2 text-sm text-[#6B5744] dark:text-slate-300">
                  <Check className="h-4 w-4 text-green-500" />
                  Voice mode included
                </li>
                <li className="flex items-center gap-2 text-sm text-[#6B5744] dark:text-slate-300">
                  <Check className="h-4 w-4 text-green-500" />
                  Resume targeting & custom scenarios
                </li>
                <li className="flex items-center gap-2 text-sm text-[#6B5744] dark:text-slate-300">
                  <Check className="h-4 w-4 text-green-500" />
                  Credits never expire
                </li>
              </ul>

              <button
                onClick={() => handlePurchase(product.key)}
                disabled={isLoading !== null}
                className={cn(
                  'mt-4 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50',
                  product.popular
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-[#3D3229]/10 dark:bg-slate-700 text-[#3D3229] dark:text-white hover:bg-[#3D3229]/20 dark:hover:bg-slate-600'
                )}
              >
                {isLoading === product.key ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Buy ${product.label}`
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Refill Option (only shown after first purchase) */}
      {subscription.hasPurchased && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-500/10 p-3">
                <refillProduct.icon className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#3D3229] dark:text-white">
                  {refillProduct.label}
                </h3>
                <p className="text-sm text-[#6B5744] dark:text-slate-400">
                  {refillProduct.description} • {refillProduct.priceDisplay}
                </p>
              </div>
            </div>
            <button
              onClick={() => handlePurchase(refillProduct.key)}
              disabled={isLoading !== null}
              className="rounded-lg bg-green-500 px-6 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {isLoading === refillProduct.key ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                'Add Credits'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Features Unlocked Info */}
      <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-800/50 p-6">
        <h3 className="text-sm font-semibold text-[#3D3229] dark:text-white mb-3">
          What&apos;s included with every purchase:
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            'All interview types unlocked',
            'Voice mode for realistic practice',
            'AI-powered feedback & scoring',
            'Resume vulnerability scanning',
            'Custom interviewer personalities',
            'Panel interview simulations',
            'Job description gap analysis',
            'Interview replay & history',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm text-[#6B5744] dark:text-slate-300">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationsTab(): React.JSX.Element {
  return (
    <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
      <h2 className="text-lg font-semibold text-[#3D3229] dark:text-white mb-6">Notification Preferences</h2>

      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Bell className="h-12 w-12 text-[#8B7355] dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-[#3D3229] dark:text-white mb-2">Coming Soon</h3>
        <p className="text-sm text-[#6B5744] dark:text-slate-400 max-w-md">
          Email notifications for weekly progress digests, practice reminders, and new features
          are coming in a future update. Stay tuned!
        </p>
      </div>
    </div>
  );
}

function SecurityTab({ email }: { email: string }): React.JSX.Element {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handlePasswordReset = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const supabase = getClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
    } catch {
      toast.error('Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      toast.success('Account deleted successfully');
      router.push('/');
    } catch {
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
      <h2 className="text-lg font-semibold text-[#3D3229] dark:text-white mb-6">Security Settings</h2>

      <div className="space-y-6">
        <div>
          <h3 className="font-medium text-[#3D3229] dark:text-white mb-2">Change Password</h3>
          <p className="text-sm text-[#6B5744] dark:text-slate-400 mb-4">
            We&apos;ll send a password reset link to your email address.
          </p>
          <button
            onClick={handlePasswordReset}
            disabled={isLoading}
            className="rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-[#3D3229]/5 dark:bg-slate-800/50 px-4 py-2 text-sm font-medium text-[#6B5744] dark:text-slate-300 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Reset Email'}
          </button>
        </div>

        <div className="pt-4 border-t border-[#3D3229]/10 dark:border-slate-800">
          <h3 className="font-medium text-[#3D3229] dark:text-white mb-2">Delete Account</h3>
          <p className="text-sm text-[#6B5744] dark:text-slate-400 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg border border-red-500/30 bg-red-500/5">
              <p className="text-sm text-red-400">
                Type <strong>DELETE</strong> to confirm account deletion:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full rounded-lg border border-red-500/30 bg-[#3D3229]/5 dark:bg-slate-800/50 px-4 py-2 text-sm text-[#3D3229] dark:text-white placeholder:text-[#8B7355] dark:placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isLoading || deleteConfirmText !== 'DELETE'}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-[#3D3229] dark:text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-[#3D3229]/5 dark:bg-slate-800/50 px-4 py-2 text-sm font-medium text-[#6B5744] dark:text-slate-300 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
