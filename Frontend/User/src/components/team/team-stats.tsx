'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';

interface TeamStatsProps {
  totalMembers: number;
  activeToday: number;
  newThisWeek: number;
  totalVolume: number;
}

export function TeamStats({
  totalMembers,
  activeToday,
  newThisWeek,
  totalVolume,
}: TeamStatsProps) {
  const stats = [
    {
      label: 'Total Members',
      value: formatNumber(totalMembers),
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Active Today',
      value: activeToday,
      icon: UserCheck,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'New This Week',
      value: newThisWeek,
      icon: TrendingUp,
      color: 'text-accent-gold',
      bgColor: 'bg-accent-gold/10',
    },
    {
      label: 'Total Volume',
      value: formatCurrency(totalVolume, 0),
      icon: TrendingUp,
      color: 'text-secondary-light',
      bgColor: 'bg-secondary/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
        >
          <Card className="p-0" hover>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', stat.bgColor)}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <div>
                  <p className="text-xs text-text-muted">{stat.label}</p>
                  <p className="text-lg font-bold text-text-primary number-counter">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
