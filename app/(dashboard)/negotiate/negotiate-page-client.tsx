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
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
      <h2 className="text-base font-semibold text-white">New Negotiation Session</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Target Role */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="target-role" className="text-slate-300">Role <span className="text-red-400">*</span></Label>
          <Input
            id="target-role"
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Software Engineer"
            className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Company */}
        <div className="space-y-1.5">
          <Label htmlFor="company" className="text-slate-300">
            Company <span className="text-slate-500 font-normal">(optional)</span>
          </Label>
          <Input
            id="company"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Corp"
            className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Experience */}
        <div className="space-y-1.5">
          <Label htmlFor="experience" className="text-slate-300">
            Years of experience <span className="text-slate-500 font-normal">(optional)</span>
          </Label>
          <Input
            id="experience"
            type="number"
            min={0}
            max={50}
            value={experienceYears}
            onChange={e => setExperienceYears(e.target.value)}
            placeholder="e.g. 7"
            className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Current offer */}
        <div className="space-y-1.5">
          <Label htmlFor="current-offer" className="text-slate-300">
            Current offer (USD) <span className="text-red-400">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <Input
              id="current-offer"
              value={currentOffer}
              onChange={e => setCurrentOffer(e.target.value)}
              onBlur={e => setCurrentOffer(formatAmountDisplay(e.target.value))}
              placeholder="120,000"
              className="pl-7 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Target */}
        <div className="space-y-1.5">
          <Label htmlFor="target-amount" className="text-slate-300">
            Your target (USD) <span className="text-red-400">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <Input
              id="target-amount"
              value={targetAmount}
              onChange={e => setTargetAmount(e.target.value)}
              onBlur={e => setTargetAmount(formatAmountDisplay(e.target.value))}
              placeholder="140,000"
              className="pl-7 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Extra context */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="context" className="text-slate-300">
            Additional context <span className="text-slate-500 font-normal">(optional)</span>
          </Label>
          <Input
            id="context"
            value={additionalContext}
            onChange={e => setAdditionalContext(e.target.value)}
            placeholder="e.g. I have a competing offer from another company for $135k"
            className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      <Button
        onClick={handleStart}
        disabled={isCreating || !targetRole.trim() || !currentOffer.trim() || !targetAmount.trim()}
        className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white"
      >
        {isCreating ? (
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4 animate-spin" />
            Starting…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Start Negotiation
          </span>
        )}
      </Button>
    </div>
  );
}

// ── Session Card ──────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: NegotiationSession }): React.JSX.Element {
  const formatAmount = (n: number): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const scoreColor = (score: number | null): string => {
    if (score === null) return 'text-slate-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
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
      className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-colors"
    >
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
        <DollarSign className="h-5 w-5 text-orange-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{session.target_role}</p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
          {session.company_name && (
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {session.company_name}
            </span>
          )}
          <span>{formatAmount(session.current_offer_amount)} → {formatAmount(session.target_amount)}</span>
          {isCompleted && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {durationLabel(session.duration_seconds)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {isCompleted && session.overall_score !== null ? (
          <div className="text-right">
            <p className={cn('text-sm font-semibold', scoreColor(session.overall_score))}>
              {session.overall_score}
            </p>
            <p className="text-xs text-slate-500">score</p>
          </div>
        ) : (
          <span className={cn(
            'text-xs font-medium rounded-full px-2 py-0.5',
            session.status === 'in_progress'
              ? 'bg-orange-500/20 text-orange-400'
              : 'bg-slate-700 text-slate-400'
          )}>
            {session.status === 'in_progress' ? 'In Progress' : 'Abandoned'}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-slate-600" />
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
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-10 text-center max-w-md mx-auto">
        <Crown className="h-10 w-10 text-amber-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white mb-2">Premium Feature</h3>
        <p className="text-slate-300 text-sm mb-4">
          Salary Negotiation Prep is available on the Premium plan.
        </p>
        <Link href="/settings?tab=billing">
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            Upgrade to Premium
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Stats row (only after first session) */}
      {completedSessions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-500">Sessions</p>
            <p className="text-2xl font-bold text-white mt-1">{completedSessions.length}</p>
          </div>
          {avgScore !== null && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs text-slate-500">Avg Score</p>
              <p className={cn(
                'text-2xl font-bold mt-1',
                avgScore >= 80 ? 'text-green-400' : avgScore >= 60 ? 'text-yellow-400' : 'text-red-400'
              )}>
                {avgScore}
              </p>
            </div>
          )}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-500">Best Score</p>
            <p className="text-2xl font-bold text-white mt-1">
              {Math.max(...completedSessions.map(s => s.overall_score ?? 0)) || '—'}
            </p>
          </div>
        </div>
      )}

      {/* Setup form */}
      <SetupForm />

      {/* Past sessions */}
      {pastSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-300">Past Sessions</h2>
          </div>
          <div className="space-y-2">
            {pastSessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
