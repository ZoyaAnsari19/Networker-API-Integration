'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-primary to-primary-light text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
        primary:
          'bg-primary text-white shadow-md hover:bg-primary-light hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]',
        secondary:
          'bg-secondary text-white shadow-md hover:bg-secondary-light hover:shadow-lg hover:shadow-secondary/20 active:scale-[0.98]',
        gold:
          'bg-gradient-to-r from-accent-gold to-accent-gold-light text-black shadow-md hover:shadow-lg hover:shadow-accent-gold/30 active:scale-[0.98]',
        outline:
          'border border-card-border bg-transparent hover:bg-card-hover text-text-primary',
        ghost:
          'hover:bg-card-hover text-text-secondary hover:text-text-primary',
        link:
          'text-primary underline-offset-4 hover:underline',
        danger:
          'bg-accent-red text-white shadow-md hover:bg-accent-red-light hover:shadow-lg hover:shadow-accent-red/30',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        xl: 'h-14 rounded-xl px-10 text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    if (asChild) {
      return (
        <Slot className={classes} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        type="button"
        className={classes}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
