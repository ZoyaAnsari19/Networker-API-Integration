'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';

interface WalletCardProps {
  title: string;
  balance: number;
  icon: LucideIcon;
  gradient?: string;
  delay?: number;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  }[];
}

export function WalletCard({
  title,
  balance,
  icon: Icon,
  gradient = 'from-primary/20 to-primary/5',
  delay = 0,
  actions = [],
}: WalletCardProps) {
  const [displayBalance, setDisplayBalance] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayBalance(balance);
    }, delay);
    return () => clearTimeout(timer);
  }, [balance, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: delay / 1000 }}
    >
      <Card className="overflow-hidden p-0">
        <div
          className={cn(
            'bg-gradient-to-br p-6',
            gradient
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/80">{title}</p>
                <motion.p
                  className="text-2xl font-bold text-white number-counter"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: delay / 1000 + 0.2 }}
                >
                  {formatCurrency(displayBalance)}
                </motion.p>
              </div>
            </div>
            <div className="flex gap-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'secondary'}
                  size="sm"
                  onClick={action.onClick}
                  className="bg-white/20 text-white hover:bg-white/30 border-0"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
