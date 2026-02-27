'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Crown,
  Plus,
  Clock,
  TrendingUp,
  ChevronRight,
  Briefcase,
  Loader2,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import type { NegotiationSession } from '@/types/database';

// ── Types ────────────────────────────────────────────────────────────────────

interface NegotiatePageClientProps {
  isPremium: boolean;
  pastSessions: NegotiationSession[];
}

// ── Setup Form ────────────────────────────────────────────────────────────────

function SetupForm(): React.JSX.Element {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const [targetRole, setTargetRole] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currentOffer, setCurrentOffer] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  const parseAmount = (raw: string): number | null => {
    const cleaned = raw.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  const handleStart = async (): Promise<void> => {
    if (!targetRole.trim()) {
      toast.error('Target role is required');
      return;
    }

    const currentAmount = parseAmount(currentOffer);
    if (currentAmount === null) {
      toast.error('Enter a valid current offer amount');
      return;
    }

    const target = parseAmount(targetAmount);
    if (target === null) {
      toast.error('Enter a valid target salary amount');
      return;
    }

    const yearsNum = experienceYears.trim()
      ? parseInt(experienceYears.trim(), 10)
      : null;

    if (yearsNum !== null && (isNaN(yearsNum) || yearsNum < 0)) {
      toast.error('Experience years must be a non-negative number');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/negotiate/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_role: targetRole.trim(),
          company_name: companyName.trim() || null,
          current_offer_amount: currentAmount,
          target_amount: target,
          experience_years: yearsNum,
          additional_context: additionalContext.trim() || null,
        }),
      });

      const data = await response.json() as { session_id?: string; message?: string };

      if (!response.ok) {
        toast.error(data.message ?? 'Failed to start session');
        return;
      }

      router.push(`/negotiate/${data.session_id}`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const formatAmountDisplay = (raw: string): string => {
    const cleaned = raw.replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return raw;
    return num.toLocaleString('en-US');
  };

  return (
    <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8 lg:p-10 space-y-8">
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-orange-500/10 p-3">
          <Plus className="h-8 w-8 text-orange-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">New Negotiation Session</h2>
          <p className="text-lg text-[#3D3229] dark:text-slate-200">Set up your scenario and start practicing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target Role */}
        <div className="lg:col-span-2 space-y-3">
          <label htmlFor="target-role" className="block text-lg font-bold text-[#3D3229] dark:text-slate-200">
            Role <span className="text-red-500">*</span>
          </label>
          <input
            id="target-role"
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Software Engineer"
            className="w-full rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 px-6 py-5 text-xl text-[#3D3229] dark:text-white placeholder:text-[#3D3229]/40 dark:placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        {/* Company */}
        <div className="space-y-3">
          <label htmlFor="company" className="block text-lg font-bold text-[#3D3229] dark:text-slate-200">
            Company <span className="text-[#3D3229]/50 dark:text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="company"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Corp"
            className="w-full rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 px-6 py-5 text-xl text-[#3D3229] dark:text-white placeholder:text-[#3D3229]/40 dark:placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        {/* Experience */}
        <div className="space-y-3">
          <label htmlFor="experience" className="block text-lg font-bold text-[#3D3229] dark:text-slate-200">
            Years of experience <span className="text-[#3D3229]/50 dark:text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="experience"
            type="number"
            min={0}
            max={50}
            value={experienceYears}
            onChange={e => setExperienceYears(e.target.value)}
            placeholder="e.g. 7"
            className="w-full rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 px-6 py-5 text-xl text-[#3D3229] dark:text-white placeholder:text-[#3D3229]/40 dark:placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        {/* Current offer */}
        <div className="space-y-3">
          <label htmlFor="current-offer" className="block text-lg font-bold text-[#3D3229] dark:text-slate-200">
            Current offer (USD) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl text-[#3D3229] dark:text-slate-300 font-bold">$</span>
            <input
              id="current-offer"
              value={currentOffer}
              onChange={e => setCurrentOffer(e.target.value)}
              onBlur={e => setCurrentOffer(formatAmountDisplay(e.target.value))}
              placeholder="120,000"
              className="w-full rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 pl-10 pr-6 py-5 text-xl text-[#3D3229] dark:text-white placeholder:text-[#3D3229]/40 dark:placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>

        {/* Target */}
        <div className="space-y-3">
          <label htmlFor="target-amount" className="block text-lg font-bold text-[#3D3229] dark:text-slate-200">
            Your target (USD) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl text-[#3D3229] dark:text-slate-300 font-bold">$</span>
            <input
              id="target-amount"
              value={targetAmount}
              onChange={e => setTargetAmount(e.target.value)}
              onBlur={e => setTargetAmount(formatAmountDisplay(e.target.value))}
              placeholder="140,000"
              className="w-full rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 pl-10 pr-6 py-5 text-xl text-[#3D3229] dark:text-white placeholder:text-[#3D3229]/40 dark:placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>

        {/* Extra context */}
        <div className="lg:col-span-2 space-y-3">
          <label htmlFor="context" className="block text-lg font-bold text-[#3D3229] dark:text-slate-200">
            Additional context <span className="text-[#3D3229]/50 dark:text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="context"
            value={additionalContext}
            onChange={e => setAdditionalContext(e.target.value)}
            placeholder="e.g. I have a competing offer from another company for $135k"
            className="w-full rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 px-6 py-5 text-xl text-[#3D3229] dark:text-white placeholder:text-[#3D3229]/40 dark:placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={isCreating || !targetRole.trim() || !currentOffer.trim() || !targetAmount.trim()}
        className="inline-flex items-center gap-3 rounded-xl bg-orange-500 hover:bg-orange-600 px-10 py-5 text-xl font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            Starting…
          </>
        ) : (
          <>
            <Zap className="h-6 w-6" />
            Start Negotiation
          </>
        )}
      </button>
    </div>
  );
}

// ── Session Card ──────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: NegotiationSession }): React.JSX.Element {
  const formatAmount = (n: number): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const scoreColor = (score: number | null): string => {
    if (score === null) return 'text-[#3D3229] dark:text-slate-400';
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const durationLabel = (secs: number | null): string => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    return `${m}m`;
  };

  const isCompleted = session.status === 'completed';

  return (
    <Link
      href={`/negotiate/${session.id}`}
      className="flex items-center gap-6 rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all"
    >
      <div className="flex-shrink-0 h-16 w-16 rounded-xl bg-orange-500/10 flex items-center justify-center">
        <DollarSign className="h-8 w-8 text-orange-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xl font-bold text-[#3D3229] dark:text-white truncate">{session.target_role}</p>
        <div className="flex items-center gap-4 mt-2 text-lg text-[#3D3229] dark:text-slate-300">
          {session.company_name && (
            <span className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {session.company_name}
            </span>
          )}
          <span className="font-semibold">{formatAmount(session.current_offer_amount)} → {formatAmount(session.target_amount)}</span>
          {isCompleted && (
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {durationLabel(session.duration_seconds)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5 flex-shrink-0">
        {isCompleted && session.overall_score !== null ? (
          <div className="text-right">
            <p className={cn('text-3xl font-bold', scoreColor(session.overall_score))}>
              {session.overall_score}
            </p>
            <p className="text-base text-[#3D3229] dark:text-slate-400 font-medium">score</p>
          </div>
        ) : (
          <span className={cn(
            'text-lg font-bold rounded-full px-4 py-2',
            session.status === 'in_progress'
              ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
              : 'bg-[#3D3229]/10 dark:bg-slate-700 text-[#3D3229] dark:text-slate-300'
          )}>
            {session.status === 'in_progress' ? 'In Progress' : 'Abandoned'}
          </span>
        )}
        <ChevronRight className="h-7 w-7 text-[#3D3229] dark:text-slate-500" />
      </div>
    </Link>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────────

export function NegotiatePageClient({ isPremium, pastSessions }: NegotiatePageClientProps): React.JSX.Element {
  const completedSessions = pastSessions.filter(s => s.status === 'completed');
  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((acc, s) => acc + (s.overall_score ?? 0), 0) / completedSessions.filter(s => s.overall_score !== null).length || 1)
    : null;

  if (!isPremium) {
    return (
      <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/10 p-12 lg:p-16 text-center max-w-2xl mx-auto">
        <Crown className="h-16 w-16 text-amber-500 mx-auto mb-6" />
        <h3 className="text-3xl font-bold text-[#3D3229] dark:text-white mb-4">Premium Feature</h3>
        <p className="text-xl text-[#3D3229] dark:text-slate-200 mb-8">
          Salary Negotiation Prep is available on the Premium plan. Practice against realistic AI recruiters and master the art of negotiation.
        </p>
        <Link
          href="/settings?tab=billing"
          className="inline-flex items-center gap-3 rounded-xl bg-amber-500 hover:bg-amber-600 px-10 py-5 text-xl font-bold text-white transition-colors"
        >
          <Crown className="h-6 w-6" />
          Upgrade to Premium
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-[1200px]">
      {/* Stats row (only after first session) */}
      {completedSessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
            <div className="flex items-center gap-3 mb-3">
              <Target className="h-6 w-6 text-blue-500" />
              <p className="text-lg text-[#3D3229] dark:text-slate-300 font-medium">Sessions</p>
            </div>
            <p className="text-5xl font-bold text-[#3D3229] dark:text-white">{completedSessions.length}</p>
          </div>
          {avgScore !== null && (
            <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="h-6 w-6 text-purple-500" />
                <p className="text-lg text-[#3D3229] dark:text-slate-300 font-medium">Avg Score</p>
              </div>
              <p className={cn(
                'text-5xl font-bold',
                avgScore >= 80 ? 'text-green-600 dark:text-green-400' : avgScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
              )}>
                {avgScore}
              </p>
            </div>
          )}
          <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="h-6 w-6 text-amber-500" />
              <p className="text-lg text-[#3D3229] dark:text-slate-300 font-medium">Best Score</p>
            </div>
            <p className="text-5xl font-bold text-[#3D3229] dark:text-white">
              {Math.max(...completedSessions.map(s => s.overall_score ?? 0)) || '—'}
            </p>
          </div>
        </div>
      )}

      {/* Setup form */}
      <SetupForm />

      {/* Past sessions */}
      {pastSessions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-[#3D3229] dark:text-slate-300" />
            <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Past Sessions</h2>
          </div>
          <div className="space-y-4">
            {pastSessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
