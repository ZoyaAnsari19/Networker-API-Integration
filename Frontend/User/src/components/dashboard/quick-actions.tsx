'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Banknote,
  TrendingUp,
  ArrowLeftRight,
  LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  color: string;
  bgColor: string;
  delay: number;
}

const quickActions: QuickAction[] = [
  {
    id: 'invite',
    label: 'Invite Friends',
    icon: UserPlus,
    href: '/invite',
    color: 'text-primary',
    bgColor: 'bg-primary/10 hover:bg-primary/20',
    delay: 0,
  },
  {
    id: 'withdraw',
    label: 'Withdraw',
    icon: Banknote,
    href: '/withdraw',
    color: 'text-accent-gold',
    bgColor: 'bg-accent-gold/10 hover:bg-accent-gold/20',
    delay: 0.1,
  },
  {
    id: 'upgrade',
    label: 'Upgrade',
    icon: TrendingUp,
    href: '/package',
    color: 'text-secondary-light',
    bgColor: 'bg-secondary/10 hover:bg-secondary/20',
    delay: 0.2,
  },
  {
    id: 'transfer',
    label: 'Transfer',
    icon: ArrowLeftRight,
    href: '/p2p',
    color: 'text-accent-blue',
    bgColor: 'bg-accent-blue/10 hover:bg-accent-blue/20',
    delay: 0.3,
  },
];

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {quickActions.map((action) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: action.delay }}
        >
          <Link href={action.href}>
            <Card
              className={cn(
                'p-4 cursor-pointer transition-all duration-300 group',
                action.bgColor,
                'hover:scale-[1.02] hover:shadow-lg'
              )}
              hover
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl bg-card group-hover:scale-110 transition-transform',
                    action.color
                  )}
                >
                  <action.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {action.label}
                </span>
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
