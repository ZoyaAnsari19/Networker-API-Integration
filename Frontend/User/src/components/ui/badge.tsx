'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/20 text-primary',
        primary: 'bg-primary text-white',
        secondary: 'bg-secondary/20 text-secondary-light',
        gold: 'bg-accent-gold/20 text-accent-gold',
        success: 'bg-green-500/20 text-green-400',
        warning: 'bg-yellow-500/20 text-yellow-400',
        danger: 'bg-red-500/20 text-red-400',
        info: 'bg-blue-500/20 text-blue-400',
        outline: 'border border-card-border text-text-secondary',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-px text-[10px]',
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
  glow?: boolean;
}

function Badge({ className, variant, size, glow, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant, size }),
        glow && 'shadow-lg shadow-current/20',
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
