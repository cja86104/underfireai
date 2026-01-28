'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'h-6 w-6',
        sm: 'h-8 w-8',
        default: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
        '2xl': 'h-20 w-20',
        '3xl': 'h-24 w-24',
      },
      ring: {
        none: '',
        default: 'ring-2 ring-background',
        primary: 'ring-2 ring-primary',
        fire: 'ring-2 ring-fire-DEFAULT',
      },
    },
    defaultVariants: {
      size: 'default',
      ring: 'none',
    },
  }
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, ring, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size, ring }), className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground font-medium',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Helper to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Convenience component
interface UserAvatarProps extends VariantProps<typeof avatarVariants> {
  src?: string | null;
  name: string;
  className?: string;
}

function UserAvatar({ src, name, size, ring, className }: UserAvatarProps) {
  return (
    <Avatar size={size} ring={ring} className={className}>
      <AvatarImage src={src || undefined} alt={name} />
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}

// Interviewer avatar with mood indicator
interface InterviewerAvatarProps extends UserAvatarProps {
  mood?: 'impressed' | 'neutral' | 'skeptical' | 'critical' | 'engaged';
}

const moodColors = {
  impressed: 'bg-score-excellent',
  neutral: 'bg-slate-400',
  skeptical: 'bg-warning',
  critical: 'bg-error',
  engaged: 'bg-info',
};

function InterviewerAvatar({ src, name, size, mood, className }: InterviewerAvatarProps) {
  return (
    <div className="relative inline-block">
      <Avatar size={size} className={className}>
        <AvatarImage src={src || undefined} alt={name} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      {mood && (
        <span 
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
            moodColors[mood]
          )}
        />
      )}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback, UserAvatar, InterviewerAvatar, avatarVariants, getInitials };
