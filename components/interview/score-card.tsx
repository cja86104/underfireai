'use client';

import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Target,
  MessageSquare,
  Brain,
  Users,
  Lightbulb,
  Star,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  type CategoryScores,
  getScoreBenchmark,
} from '@/types/scoring';

interface ScoreCardProps {
  score: number;
  label?: string;
  subtitle?: string;
  previousScore?: number;
  showBenchmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'detailed';
  className?: string;
}

interface CategoryScoreCardProps {
  categoryScores: CategoryScores;
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
}

interface ScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

const CATEGORY_CONFIG: Record<
  keyof CategoryScores,
  { label: string; icon: typeof Target; description: string }
> = {
  communication: {
    label: 'Communication',
    icon: MessageSquare,
    description: 'Clarity and articulation',
  },
  technicalDepth: {
    label: 'Technical Depth',
    icon: Brain,
    description: 'Knowledge and expertise',
  },
  behavioralExamples: {
    label: 'Behavioral Examples',
    icon: Users,
    description: 'Real-world scenarios',
  },
  cultureFit: {
    label: 'Culture Fit',
    icon: Users,
    description: 'Values alignment',
  },
  problemSolving: {
    label: 'Problem Solving',
    icon: Lightbulb,
    description: 'Analytical thinking',
  },
  starUsage: {
    label: 'STAR Usage',
    icon: Star,
    description: 'Structured responses',
  },
  confidence: {
    label: 'Confidence',
    icon: Shield,
    description: 'Self-assurance',
  },
  relevance: {
    label: 'Relevance',
    icon: Target,
    description: 'On-topic answers',
  },
};

function getScoreColor(score: number): string {
  const benchmark = getScoreBenchmark(score);
  return benchmark.color;
}

function getScoreGradient(score: number): string {
  if (score >= 90) return 'from-green-500 to-emerald-400';
  if (score >= 80) return 'from-lime-500 to-green-400';
  if (score >= 70) return 'from-yellow-500 to-lime-400';
  if (score >= 60) return 'from-orange-500 to-yellow-400';
  if (score >= 50) return 'from-red-500 to-orange-400';
  return 'from-red-600 to-red-500';
}

function getScoreBgClass(score: number): string {
  if (score >= 90) return 'bg-green-50 border-green-200';
  if (score >= 80) return 'bg-lime-50 border-lime-200';
  if (score >= 70) return 'bg-yellow-50 border-yellow-200';
  if (score >= 60) return 'bg-orange-50 border-orange-200';
  if (score >= 50) return 'bg-red-50 border-red-200';
  return 'bg-red-100 border-red-300';
}

export function ScoreRing({
  score,
  size = 'md',
  showLabel = true,
  animated = true,
}: ScoreRingProps): React.JSX.Element {
  const sizeConfig = {
    sm: { dimension: 64, strokeWidth: 4, fontSize: 'text-lg' },
    md: { dimension: 96, strokeWidth: 6, fontSize: 'text-2xl' },
    lg: { dimension: 144, strokeWidth: 8, fontSize: 'text-4xl' },
  };

  const config = sizeConfig[size];
  const radius = (config.dimension - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={config.dimension}
        height={config.dimension}
        className={cn(animated && 'transition-all duration-1000')}
      >
        {/* Background circle */}
        <circle
          cx={config.dimension / 2}
          cy={config.dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-stone-200"
        />
        {/* Progress circle */}
        <circle
          cx={config.dimension / 2}
          cy={config.dimension / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className={cn(animated && 'transition-all duration-1000')}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn('font-bold', config.fontSize)}
            style={{ color }}
          >
            {Math.round(score)}
          </span>
        </div>
      )}
    </div>
  );
}

export function ScoreCard({
  score,
  label = 'Overall Score',
  subtitle,
  previousScore,
  showBenchmark = true,
  size = 'md',
  variant = 'default',
  className,
}: ScoreCardProps): React.JSX.Element {
  const benchmark = useMemo(() => getScoreBenchmark(score), [score]);
  const scoreDiff = previousScore !== undefined ? score - previousScore : null;

  const renderTrend = (): React.JSX.Element | null => {
    if (scoreDiff === null) return null;

    if (scoreDiff > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600 text-sm">
          <TrendingUp className="h-4 w-4" />
          <span>+{scoreDiff.toFixed(0)}</span>
        </div>
      );
    }
    if (scoreDiff < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600 text-sm">
          <TrendingDown className="h-4 w-4" />
          <span>{scoreDiff.toFixed(0)}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-charcoal-400 text-sm">
        <Minus className="h-4 w-4" />
        <span>No change</span>
      </div>
    );
  };

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5',
          getScoreBgClass(score),
          className
        )}
      >
        <span
          className="font-bold"
          style={{ color: getScoreColor(score) }}
        >
          {Math.round(score)}
        </span>
        {label && <span className="text-sm text-charcoal-500">{label}</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 shadow-card',
        getScoreBgClass(score),
        className
      )}
    >
      <div className="flex items-center gap-4">
        <ScoreRing score={score} size={size} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-charcoal-900">{label}</h3>
            {renderTrend()}
          </div>

          {showBenchmark && (
            <div className="flex items-center gap-2 mt-1">
              <Award
                className="h-4 w-4"
                style={{ color: benchmark.color }}
              />
              <span
                className="font-medium"
                style={{ color: benchmark.color }}
              >
                {benchmark.label}
              </span>
            </div>
          )}

          {subtitle && (
            <p className="text-sm text-charcoal-500 mt-1">{subtitle}</p>
          )}

          {variant === 'detailed' && (
            <p className="text-xs text-charcoal-400 mt-2">
              {benchmark.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function CategoryScoreCard({
  categoryScores,
  showLabels = true,
  compact = false,
  className,
}: CategoryScoreCardProps): React.JSX.Element {
  const categories = Object.entries(categoryScores) as [keyof CategoryScores, number][];

  if (compact) {
    return (
      <div className={cn('grid grid-cols-4 gap-2', className)}>
        {categories.map(([key, value]) => {
          const config = CATEGORY_CONFIG[key];
          const Icon = config.icon;

          return (
            <div
              key={key}
              className={cn(
                'rounded-lg border p-2 text-center bg-white',
                getScoreBgClass(value)
              )}
              title={config.label}
            >
              <Icon
                className="h-4 w-4 mx-auto mb-1"
                style={{ color: getScoreColor(value) }}
              />
              <span
                className="font-bold text-sm"
                style={{ color: getScoreColor(value) }}
              >
                {Math.round(value)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {categories.map(([key, value]) => {
        const config = CATEGORY_CONFIG[key];
        const Icon = config.icon;
        const color = getScoreColor(value);

        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-charcoal-400" />
                {showLabels && (
                  <span className="text-sm text-charcoal-600">{config.label}</span>
                )}
              </div>
              <span
                className="font-medium text-sm"
                style={{ color }}
              >
                {Math.round(value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full bg-gradient-to-r transition-all duration-500',
                  getScoreGradient(value)
                )}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreSummaryCard({
  overallScore,
  categoryScores,
  strengths,
  improvements,
  className,
}: {
  overallScore: number;
  categoryScores: CategoryScores;
  strengths: string[];
  improvements: string[];
  className?: string;
}): React.JSX.Element {
  const benchmark = getScoreBenchmark(overallScore);

  return (
    <div className={cn('rounded-xl border border-stone-200 bg-white shadow-card', className)}>
      {/* Header with overall score */}
      <div className="p-6 border-b border-stone-200">
        <div className="flex items-center gap-6">
          <ScoreRing score={overallScore} size="lg" />
          <div>
            <h2 className="text-2xl font-bold text-charcoal-900">Interview Complete</h2>
            <div className="flex items-center gap-2 mt-1">
              <Award className="h-5 w-5" style={{ color: benchmark.color }} />
              <span
                className="text-lg font-medium"
                style={{ color: benchmark.color }}
              >
                {benchmark.label}
              </span>
            </div>
            <p className="text-sm text-charcoal-500 mt-1">{benchmark.description}</p>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="p-6 border-b border-stone-200">
        <h3 className="text-sm font-medium text-charcoal-500 mb-4">Score Breakdown</h3>
        <CategoryScoreCard categoryScores={categoryScores} />
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-2 divide-x divide-stone-200">
        <div className="p-6">
          <h3 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Strengths
          </h3>
          <ul className="space-y-2">
            {strengths.slice(0, 3).map((strength) => (
              <li key={strength} className="text-sm text-charcoal-600 flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-6">
          <h3 className="text-sm font-medium text-amber-600 mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Areas to Improve
          </h3>
          <ul className="space-y-2">
            {improvements.slice(0, 3).map((item) => (
              <li key={item} className="text-sm text-charcoal-600 flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ScoreBadge({
  score,
  size = 'md',
}: {
  score: number;
  size?: 'sm' | 'md';
}): React.JSX.Element {
  const color = getScoreColor(score);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold',
        sizeClasses
      )}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        borderWidth: 1,
        borderColor: `${color}30`,
      }}
    >
      {Math.round(score)}
    </span>
  );
}
