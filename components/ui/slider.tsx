'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils/cn';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

// Labeled slider for difficulty settings
interface LabeledSliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  label?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
}

const LabeledSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  LabeledSliderProps
>(({ className, label, showValue, valueFormatter, value, ...props }, ref) => {
  const displayValue = value?.[0] ?? 0;
  const formattedValue = valueFormatter ? valueFormatter(displayValue) : displayValue.toString();

  return (
    <div className="w-full space-y-2">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-sm font-medium">{label}</span>}
          {showValue && (
            <span className="text-sm text-muted-foreground">{formattedValue}</span>
          )}
        </div>
      )}
      <Slider ref={ref} value={value} className={className} {...props} />
    </div>
  );
});
LabeledSlider.displayName = 'LabeledSlider';

// Difficulty slider with labels
interface DifficultySliderProps {
  value: number;
  onValueChange: (value: number) => void;
}

const difficultyLabels: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Easy',
  4: 'Medium',
  5: 'Medium',
  6: 'Medium',
  7: 'Hard',
  8: 'Hard',
  9: 'Expert',
  10: 'Expert',
};

function DifficultySlider({ value, onValueChange }: DifficultySliderProps) {
  return (
    <LabeledSlider
      label="Difficulty"
      showValue
      value={[value]}
      onValueChange={([v]) => onValueChange(v)}
      min={1}
      max={10}
      step={1}
      valueFormatter={(v) => `${v}/10 - ${difficultyLabels[v] || 'Medium'}`}
    />
  );
}

export { Slider, LabeledSlider, DifficultySlider };
