'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const progressVariants = cva(
  'h-2 w-full overflow-hidden rounded-full bg-card-hover',
  {
    variants: {
      variant: {
        default: '',
        primary: '',
        gold: '',
        success: '',
      },
      size: {
        default: 'h-2',
        sm: 'h-1',
        lg: 'h-3',
        xl: 'h-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/** Radix Progress rejects NaN; callers sometimes pass bad math (e.g. 0/0). */
function clampProgressValue(v: number | undefined | null): number {
  if (v == null || typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) {
    return 0;
  }
  return Math.min(100, Math.max(0, v));
}

const indicatorVariants = cva(
  'h-full w-full flex-1 transition-all duration-500 ease-out',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        primary: 'bg-gradient-to-r from-primary to-primary-light',
        gold: 'bg-gradient-to-r from-accent-gold to-accent-gold-light',
        success: 'bg-green-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  indicatorVariant?: VariantProps<typeof indicatorVariants>['variant'];
  showValue?: boolean;
  animated?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, variant, size, indicatorVariant, showValue, animated, value, ...props }, ref) => {
  const safeValue = clampProgressValue(value ?? 0);
  const [displayValue, setDisplayValue] = React.useState(animated ? 0 : safeValue);

  React.useEffect(() => {
    const next = clampProgressValue(value ?? 0);
    if (animated) {
      const timer = setTimeout(() => setDisplayValue(next), 100);
      return () => clearTimeout(timer);
    }
    setDisplayValue(next);
  }, [value, animated]);

  return (
    <div className="relative w-full">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ variant, size }), className)}
        value={displayValue}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            indicatorVariants({ variant: indicatorVariant || variant }),
            animated && 'animate-pulse-glow'
          )}
          style={{ transform: `translateX(-${100 - (displayValue || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
      {showValue && (
        <span className="absolute -top-6 right-0 text-xs font-medium text-text-secondary">
          {Math.round(displayValue || 0)}%
        </span>
      )}
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
