'use client';

import { useState } from 'react';
import {
  Trophy,
  Flame,
  Target,
  Zap,
  Star,
  Award,
  Medal,
  Crown,
  Rocket,
  Shield,
  Heart,
  Clock,
  TrendingUp,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  category: 'streak' | 'performance' | 'milestone' | 'special';
  requirement: string;
  earnedAt?: string | null;
  progress?: number; // 0-100 percentage
}

interface BadgeGridProps {
  badges: Badge[];
  showLocked?: boolean;
  columns?: 3 | 4 | 5;
  onBadgeClick?: (badge: Badge) => void;
  className?: string;
}

interface BadgeCardProps {
  badge: Badge;
  onClick?: () => void;
}

interface BadgeDetailModalProps {
  badge: Badge | null;
  onClose: () => void;
}

const ICON_MAP: Record<string, typeof Trophy> = {
  trophy: Trophy,
  flame: Flame,
  target: Target,
  zap: Zap,
  star: Star,
  award: Award,
  medal: Medal,
  crown: Crown,
  rocket: Rocket,
  shield: Shield,
  heart: Heart,
  clock: Clock,
  trending: TrendingUp,
  check: CheckCircle,
};

const TIER_CONFIG: Record<
  Badge['tier'],
  { color: string; bgColor: string; borderColor: string; glowColor: string }
> = {
  bronze: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    glowColor: 'rgba(180, 83, 9, 0.3)',
  },
  silver: {
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    glowColor: 'rgba(100, 116, 139, 0.3)',
  },
  gold: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
    glowColor: 'rgba(202, 138, 4, 0.4)',
  },
  platinum: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    glowColor: 'rgba(147, 51, 234, 0.4)',
  },
};

const CATEGORY_LABELS: Record<Badge['category'], string> = {
  streak: 'Consistency',
  performance: 'Performance',
  milestone: 'Milestone',
  special: 'Special',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function BadgeCard({ badge, onClick }: BadgeCardProps) {
  const isEarned = !!badge.earnedAt;
  const tier = TIER_CONFIG[badge.tier];
  const Icon = ICON_MAP[badge.icon] || Trophy;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center p-4 rounded-xl border transition-all duration-300',
        isEarned
          ? cn(tier.bgColor, tier.borderColor, 'hover:shadow-lg hover:-translate-y-1')
          : 'bg-stone-50 border-stone-200 opacity-50 hover:opacity-70'
      )}
      style={
        isEarned
          ? { boxShadow: `0 4px 20px ${tier.glowColor}` }
          : undefined
      }
    >
      {/* Tier indicator */}
      <div
        className={cn(
          'absolute -top-2 -right-2 rounded-full px-2 py-0.5 text-xs font-bold uppercase',
          isEarned ? cn(tier.bgColor, tier.color, 'border', tier.borderColor) : 'bg-stone-200 text-stone-400'
        )}
      >
        {badge.tier}
      </div>

      {/* Icon */}
      <div
        className={cn(
          'rounded-full p-3 mb-2',
          isEarned ? tier.bgColor : 'bg-stone-100'
        )}
      >
        {isEarned ? (
          <Icon className={cn('h-8 w-8', tier.color)} />
        ) : (
          <Lock className="h-8 w-8 text-stone-400" />
        )}
      </div>

      {/* Name */}
      <h4
        className={cn(
          'font-semibold text-sm text-center',
          isEarned ? 'text-charcoal-900' : 'text-charcoal-400'
        )}
      >
        {badge.name}
      </h4>

      {/* Progress bar for locked badges */}
      {!isEarned && badge.progress !== undefined && badge.progress > 0 && (
        <div className="w-full mt-2">
          <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-fire-400"
              style={{ width: `${badge.progress}%` }}
            />
          </div>
          <p className="text-xs text-charcoal-400 text-center mt-1">
            {badge.progress}%
          </p>
        </div>
      )}
    </button>
  );
}

function BadgeDetailModal({ badge, onClose }: BadgeDetailModalProps) {
  if (!badge) return null;

  const isEarned = !!badge.earnedAt;
  const tier = TIER_CONFIG[badge.tier];
  const Icon = ICON_MAP[badge.icon] || Trophy;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={cn('p-6 text-center', tier.bgColor)}
          style={
            isEarned
              ? { boxShadow: `inset 0 -20px 40px ${tier.glowColor}` }
              : undefined
          }
        >
          <div
            className={cn(
              'inline-flex rounded-full p-4 mb-3',
              isEarned ? 'bg-white shadow-lg' : 'bg-stone-100'
            )}
          >
            {isEarned ? (
              <Icon className={cn('h-12 w-12', tier.color)} />
            ) : (
              <Lock className="h-12 w-12 text-stone-400" />
            )}
          </div>
          <h3 className="text-xl font-bold text-charcoal-900">{badge.name}</h3>
          <div
            className={cn(
              'inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase',
              tier.bgColor,
              tier.color,
              'border',
              tier.borderColor
            )}
          >
            {badge.tier}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-charcoal-500 mb-1">Category</p>
            <p className="font-medium text-charcoal-900">
              {CATEGORY_LABELS[badge.category]}
            </p>
          </div>

          <div>
            <p className="text-sm text-charcoal-500 mb-1">Description</p>
            <p className="text-charcoal-700">{badge.description}</p>
          </div>

          <div>
            <p className="text-sm text-charcoal-500 mb-1">How to earn</p>
            <p className="text-charcoal-700">{badge.requirement}</p>
          </div>

          {isEarned && badge.earnedAt && (
            <div className="pt-4 border-t border-stone-200">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  Earned on {formatDate(badge.earnedAt)}
                </span>
              </div>
            </div>
          )}

          {!isEarned && badge.progress !== undefined && (
            <div className="pt-4 border-t border-stone-200">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-charcoal-500">Progress</span>
                <span className="font-medium text-charcoal-900">
                  {badge.progress}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-fire-500"
                  style={{ width: `${badge.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-stone-100 text-charcoal-700 font-medium hover:bg-stone-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function BadgeGrid({
  badges,
  showLocked = true,
  columns = 4,
  onBadgeClick,
  className,
}: BadgeGridProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const filteredBadges = showLocked
    ? badges
    : badges.filter((b) => b.earnedAt);

  const earnedCount = badges.filter((b) => b.earnedAt).length;

  const columnClasses = {
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  };

  const handleBadgeClick = (badge: Badge) => {
    if (onBadgeClick) {
      onBadgeClick(badge);
    } else {
      setSelectedBadge(badge);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-fire-500" />
          <span className="font-medium text-charcoal-900">Achievements</span>
        </div>
        <span className="text-sm text-charcoal-500">
          {earnedCount} / {badges.length} earned
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fire-500 to-amber-400 transition-all duration-500"
          style={{ width: `${(earnedCount / badges.length) * 100}%` }}
        />
      </div>

      {/* Grid */}
      <div className={cn('grid gap-3', columnClasses[columns])}>
        {filteredBadges.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            onClick={() => handleBadgeClick(badge)}
          />
        ))}
      </div>

      {/* Detail Modal */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
}

/**
 * Compact badge display for profiles/headers
 */
export function BadgeShowcase({
  badges,
  maxVisible = 5,
  className,
}: {
  badges: Badge[];
  maxVisible?: number;
  className?: string;
}) {
  const earnedBadges = badges.filter((b) => b.earnedAt);
  const visibleBadges = earnedBadges.slice(0, maxVisible);
  const hiddenCount = Math.max(0, earnedBadges.length - maxVisible);

  if (earnedBadges.length === 0) {
    return (
      <div className={cn('text-sm text-charcoal-400', className)}>
        No badges earned yet
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {visibleBadges.map((badge) => {
        const tier = TIER_CONFIG[badge.tier];
        const Icon = ICON_MAP[badge.icon] || Trophy;

        return (
          <div
            key={badge.id}
            className={cn(
              'rounded-full p-1.5',
              tier.bgColor,
              'border',
              tier.borderColor
            )}
            title={badge.name}
          >
            <Icon className={cn('h-4 w-4', tier.color)} />
          </div>
        );
      })}
      {hiddenCount > 0 && (
        <span className="text-xs text-charcoal-500 ml-1">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}

/**
 * Single badge display
 */
export function BadgeDisplay({
  badge,
  size = 'md',
  showName = true,
  className,
}: {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}) {
  const isEarned = !!badge.earnedAt;
  const tier = TIER_CONFIG[badge.tier];
  const Icon = ICON_MAP[badge.icon] || Trophy;

  const sizeClasses = {
    sm: { container: 'p-2', icon: 'h-5 w-5', text: 'text-xs' },
    md: { container: 'p-3', icon: 'h-6 w-6', text: 'text-sm' },
    lg: { container: 'p-4', icon: 'h-8 w-8', text: 'text-base' },
  };

  const config = sizeClasses[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full',
          config.container,
          isEarned ? tier.bgColor : 'bg-stone-100',
          isEarned && 'border',
          isEarned && tier.borderColor
        )}
      >
        {isEarned ? (
          <Icon className={cn(config.icon, tier.color)} />
        ) : (
          <Lock className={cn(config.icon, 'text-stone-400')} />
        )}
      </div>
      {showName && (
        <span
          className={cn(
            'font-medium',
            config.text,
            isEarned ? 'text-charcoal-900' : 'text-charcoal-400'
          )}
        >
          {badge.name}
        </span>
      )}
    </div>
  );
}
