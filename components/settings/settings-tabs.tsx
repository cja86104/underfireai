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
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { getClient } from '@/lib/client';

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
    interviewsRemaining?: number;
  };
  onboardingCompleted: boolean;
}

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

export function SettingsTabs({
  activeTab,
  user,
  subscription,
  onboardingCompleted: _onboardingCompleted,
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
      <div className="flex gap-1 p-1 rounded-lg bg-slate-800/50 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center',
              currentTab === tab.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
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
    } catch (_error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Profile Information</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user.email}
            disabled
            className="w-full rounded-lg border border-slate-700 bg-slate-800/30 px-4 py-2.5 text-slate-400 cursor-not-allowed"
          />
          <p className="text-xs text-slate-500 mt-1">
            Email cannot be changed
          </p>
        </div>

        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-1.5">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Your name"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
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
  const [isLoading, setIsLoading] = useState(false);

  const plans = [
    {
      tier: 'free' as const,
      name: 'Free',
      price: '$0',
      features: ['3 interviews/month', 'Basic feedback', 'Text mode only'],
    },
    {
      tier: 'pro' as const,
      name: 'Pro',
      price: '$19',
      features: ['Unlimited interviews', 'Voice mode', 'Full analytics', 'Priority support'],
      popular: true,
    },
    {
      tier: 'premium' as const,
      name: 'Premium',
      price: '$39',
      features: ['Everything in Pro', 'Resume coaching', 'Company profiles', 'Priority support'],
    },
  ];

  const handleUpgrade = async (tier: 'pro' | 'premium'): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json() as { url: string };
      window.location.href = data.url;
    } catch (_error) {
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBilling = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const data = await response.json() as { url: string };
      window.location.href = data.url;
    } catch (_error) {
      toast.error('Failed to open billing portal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'rounded-lg p-2',
              subscription.tier === 'premium' ? 'bg-amber-500/20' :
              subscription.tier === 'pro' ? 'bg-orange-500/20' : 'bg-slate-700'
            )}>
              <Crown className={cn(
                'h-5 w-5',
                subscription.tier === 'premium' ? 'text-amber-400' :
                subscription.tier === 'pro' ? 'text-orange-500' : 'text-slate-400'
              )} />
            </div>
            <div>
              <p className="font-semibold text-white capitalize">{subscription.tier} Plan</p>
              <p className="text-sm text-slate-400">
                {subscription.tier === 'free'
                  ? `${subscription.interviewsRemaining} interviews remaining this month`
                  : `Status: ${subscription.status}`}
              </p>
            </div>
          </div>
          {subscription.tier !== 'free' && (
            <button
              onClick={handleManageBilling}
              disabled={isLoading}
              className="text-sm text-orange-500 hover:text-orange-400 flex items-center gap-1"
            >
              Manage Billing
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Plan Options */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={cn(
                'rounded-xl border p-5',
                plan.popular
                  ? 'border-orange-500 bg-orange-500/5'
                  : 'border-slate-800 bg-slate-900/50',
                subscription.tier === plan.tier && 'ring-2 ring-orange-500'
              )}
            >
              {plan.popular && (
                <span className="inline-block rounded-full bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white mb-3">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="text-2xl font-bold text-white mt-1">
                {plan.price}
                <span className="text-sm font-normal text-slate-400">/month</span>
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              {subscription.tier === plan.tier ? (
                <div className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-center text-sm text-slate-400">
                  Current Plan
                </div>
              ) : plan.tier !== 'free' ? (
                <button
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={isLoading}
                  className="mt-4 w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Upgrade'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationsTab(): React.JSX.Element {
  const [settings, setSettings] = useState({
    emailDigest: true,
    practiceReminders: true,
    newFeatures: false,
  });

  const handleToggle = (key: keyof typeof settings): void => {
    setSettings({ ...settings, [key]: !settings[key] });
    toast.success('Notification preference updated');
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Notification Preferences</h2>
      
      <div className="space-y-4">
        <NotificationToggle
          label="Weekly Progress Digest"
          description="Get a summary of your interview practice each week"
          enabled={settings.emailDigest}
          onToggle={() => handleToggle('emailDigest')}
        />
        <NotificationToggle
          label="Practice Reminders"
          description="Gentle nudges to keep your streak going"
          enabled={settings.practiceReminders}
          onToggle={() => handleToggle('practiceReminders')}
        />
        <NotificationToggle
          label="New Features"
          description="Be the first to know about new interview types and features"
          enabled={settings.newFeatures}
          onToggle={() => handleToggle('newFeatures')}
        />
      </div>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
      <div>
        <p className="font-medium text-white">{label}</p>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          enabled ? 'bg-orange-500' : 'bg-slate-700'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

function SecurityTab({ email }: { email: string }): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordReset = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const supabase = getClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
    } catch (_error) {
      toast.error('Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Security Settings</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="font-medium text-white mb-2">Change Password</h3>
          <p className="text-sm text-slate-400 mb-4">
            We&apos;ll send a password reset link to your email address.
          </p>
          <button
            onClick={handlePasswordReset}
            disabled={isLoading}
            className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Reset Email'}
          </button>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <h3 className="font-medium text-white mb-2">Delete Account</h3>
          <p className="text-sm text-slate-400 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
