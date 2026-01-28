'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';

const progressVariants = cva(
  'relative w-full overflow-hidden rounded-full bg-secondary',
  {
    variants: {
      size: {
        sm: 'h-1',
        default: 'h-2',
        lg: 'h-3',
        xl: 'h-4',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const indicatorVariants = cva(
  'h-full w-full flex-1 transition-all duration-300 ease-in-out',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        fire: 'bg-fire-gradient',
        success: 'bg-score-excellent',
        warning: 'bg-warning',
        error: 'bg-error',
        score: '', // Dynamic based on value
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof indicatorVariants> {
  showValue?: boolean;
  label?: string;
}

function getScoreColor(value: number): string {
  if (value >= 90) return 'bg-score-excellent';
  if (value >= 80) return 'bg-score-good';
  if (value >= 70) return 'bg-yellow-500';
  if (value >= 60) return 'bg-score-average';
  if (value >= 50) return 'bg-score-poor';
  return 'bg-score-critical';
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, size, variant, showValue, label, ...props }, ref) => {
  const indicatorClass = variant === 'score' 
    ? getScoreColor(value || 0) 
    : indicatorVariants({ variant });

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && (
            <span className="font-medium">{Math.round(value || 0)}%</span>
          )}
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ size }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(indicatorClass)}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

// Score display with circular progress
interface ScoreCircleProps {
  value: number;
  size?: 'sm' | 'default' | 'lg';
  label?: string;
  showLabel?: boolean;
}

const sizeMap = {
  sm: { size: 60, stroke: 4, fontSize: 'text-sm' },
  default: { size: 80, stroke: 6, fontSize: 'text-lg' },
  lg: { size: 120, stroke: 8, fontSize: 'text-2xl' },
};

function ScoreCircle({ value, size = 'default', label, showLabel = true }: ScoreCircleProps) {
  const { size: svgSize, stroke, fontSize } = sizeMap[size];
  const radius = (svgSize - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  const colorClass = getScoreColor(value);
  // Extract color from class for SVG stroke
  const colorMap: Record<string, string> = {
    'bg-score-excellent': '#22c55e',
    'bg-score-good': '#84cc16',
    'bg-yellow-500': '#eab308',
    'bg-score-average': '#eab308',
    'bg-score-poor': '#f97316',
    'bg-score-critical': '#ef4444',
  };
  const strokeColor = colorMap[colorClass] || '#d97706';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg
          className="rotate-[-90deg]"
          width={svgSize}
          height={svgSize}
        >
          {/* Background circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-secondary"
          />
          {/* Progress circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className={cn(
          'absolute inset-0 flex items-center justify-center font-bold',
          fontSize
        )}>
          {Math.round(value)}
        </div>
      </div>
      {showLabel && label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

export { Progress, ScoreCircle, progressVariants, getScoreColor };
