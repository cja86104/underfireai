import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success:
          'border-transparent bg-score-excellent text-white',
        warning:
          'border-transparent bg-warning text-white',
        error:
          'border-transparent bg-error text-white',
        fire:
          'border-transparent bg-fire-DEFAULT text-white',
        // Interview type badges
        behavioral:
          'border-transparent bg-blue-500 text-white',
        technical:
          'border-transparent bg-purple-500 text-white',
        case:
          'border-transparent bg-indigo-500 text-white',
        hr:
          'border-transparent bg-green-500 text-white',
        panel:
          'border-transparent bg-orange-500 text-white',
        phone_screen:
          'border-transparent bg-cyan-500 text-white',
        // Mood badges
        impressed:
          'border-transparent bg-score-excellent/20 text-score-excellent',
        neutral:
          'border-transparent bg-slate-500/20 text-slate-400',
        skeptical:
          'border-transparent bg-warning/20 text-warning',
        critical:
          'border-transparent bg-error/20 text-error',
        engaged:
          'border-transparent bg-info/20 text-info',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-2xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps): React.JSX.Element {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </div>
  );
}

// Interview type badge helper
function InterviewTypeBadge({ type }: { type: string }): React.JSX.Element {
  const typeMap: Record<string, { label: string; variant: 'behavioral' | 'technical' | 'case' | 'hr' | 'panel' | 'phone_screen' }> = {
    behavioral: { label: 'Behavioral', variant: 'behavioral' },
    technical: { label: 'Technical', variant: 'technical' },
    case: { label: 'Case Study', variant: 'case' },
    hr: { label: 'HR', variant: 'hr' },
    panel: { label: 'Panel', variant: 'panel' },
    phone_screen: { label: 'Phone Screen', variant: 'phone_screen' },
  };

  const { label, variant } = typeMap[type] || { label: type, variant: 'default' as const };

  return <Badge variant={variant}>{label}</Badge>;
}

// Score badge helper
function ScoreBadge({ score }: { score: number }): React.JSX.Element {
  let variant: 'success' | 'warning' | 'error' | 'default' = 'default';
  
  if (score >= 80) variant = 'success';
  else if (score >= 60) variant = 'warning';
  else variant = 'error';

  return <Badge variant={variant}>{score}%</Badge>;
}

// Difficulty badge helper
function DifficultyBadge({ level }: { level: number }): React.JSX.Element {
  let variant: 'success' | 'warning' | 'error' = 'success';
  let label = 'Easy';
  
  if (level >= 8) {
    variant = 'error';
    label = 'Expert';
  } else if (level >= 6) {
    variant = 'warning';
    label = 'Hard';
  } else if (level >= 4) {
    variant = 'warning';
    label = 'Medium';
  }

  return <Badge variant={variant}>{label}</Badge>;
}

export { Badge, badgeVariants, InterviewTypeBadge, ScoreBadge, DifficultyBadge };
