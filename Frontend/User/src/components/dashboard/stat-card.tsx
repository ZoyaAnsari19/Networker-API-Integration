'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  format?: 'currency' | 'number' | 'percentage';
  loading?: boolean;
  delay?: number;
  glow?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-primary',
  format = 'currency',
  loading = false,
  delay = 0,
  glow = false,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const formattedValue =
    format === 'currency'
      ? formatCurrency(displayValue)
      : format === 'percentage'
      ? `${displayValue.toFixed(1)}%`
      : displayValue.toLocaleString();

  const isPositive = change !== undefined && change >= 0;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton variant="circular" width={48} height={48} />
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card
        className={cn(
          'p-6 group cursor-pointer',
          glow && 'shadow-glow'
        )}
        hover
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-text-secondary">{title}</p>
            <motion.p
              className="text-3xl font-bold number-counter text-text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: delay / 1000 + 0.2 }}
            >
              {formattedValue}
            </motion.p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                <Badge
                  variant={isPositive ? 'success' : 'danger'}
                  size="sm"
                  className="gap-1"
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(change).toFixed(1)}%
                </Badge>
                <span className="text-xs text-text-muted">vs last period</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl bg-card-hover transition-all duration-300 group-hover:scale-110',
              iconColor.startsWith('text-') && iconColor
            )}
          >
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
