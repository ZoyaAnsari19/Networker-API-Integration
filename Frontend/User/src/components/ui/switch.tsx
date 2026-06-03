'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const switchVariants = cva(
  'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-card-hover data-[state=checked]:bg-primary',
        primary: 'bg-card-hover data-[state=checked]:bg-primary',
        secondary: 'bg-card-hover data-[state=checked]:bg-secondary',
        gold: 'bg-card-hover data-[state=checked]:bg-accent-gold',
      },
      size: {
        sm: 'h-5 w-9',
        default: 'h-6 w-11',
        lg: 'h-7 w-14',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const switchThumbVariants = cva(
  'pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 translate-x-0.5 data-[state=checked]:translate-x-4',
        default: 'h-5 w-5 translate-x-0.5 data-[state=checked]:translate-x-5',
        lg: 'h-6 w-6 translate-x-0.5 data-[state=checked]:translate-x-7',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, variant, size, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(switchVariants({ variant, size, className }))}
    {...props}
  >
    <SwitchPrimitive.Thumb className={switchThumbVariants({ size })} />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
