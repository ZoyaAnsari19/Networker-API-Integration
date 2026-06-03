'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, Clock, IndianRupee, ArrowLeft, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';

interface InviteStatsProps {
  totalInvited: number;
  activeUsers: number;
  pendingPlacements: number;
  totalCommission: number;
  leftCount: number;
  rightCount: number;
  /** Directs with placement_status pending / no tree leg yet */
  unplacedCount: number;
}

export function InviteStats({
  totalInvited,
  activeUsers,
  pendingPlacements,
  totalCommission,
  leftCount,
  rightCount,
  unplacedCount,
}: InviteStatsProps) {
  const activePercentage = totalInvited > 0 ? (activeUsers / totalInvited) * 100 : 0;
  const placementTotal = leftCount + rightCount + unplacedCount;
  const leftPercentage = placementTotal > 0 ? (leftCount / placementTotal) * 100 : 0;
  const rightPercentage = placementTotal > 0 ? (rightCount / placementTotal) * 100 : 0;
  const unplacedPercentage = placementTotal > 0 ? (unplacedCount / placementTotal) * 100 : 0;

  const stats = [
    {
      label: 'Total Invited',
      value: totalInvited,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Active Users',
      value: activeUsers,
      icon: UserCheck,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Pending',
      value: pendingPlacements,
      icon: Clock,
      color: 'text-accent-gold',
      bgColor: 'bg-accent-gold/10',
    },
    {
      label: 'Commission Earned',
      value: totalCommission,
      icon: IndianRupee,
      color: 'text-accent-gold',
      bgColor: 'bg-accent-gold/10',
      isCurrency: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
        >
          <Card className="p-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', stat.bgColor)}>
                  <stat.icon className={cn('h-6 w-6', stat.color)} />
                </div>
                <div>
                  <p className="text-sm text-text-secondary">{stat.label}</p>
                  <p className="text-xl font-bold text-text-primary number-counter">
                    {stat.isCurrency ? formatCurrency(stat.value) : formatNumber(stat.value)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Placement Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="md:col-span-2 lg:col-span-4"
      >
        <Card className="p-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg">Direct placement</CardTitle>
            <p className="text-xs text-text-muted mt-1 font-normal">
              Sirf aapke <span className="font-medium text-text-secondary">direct referrals</span> ka
              left/right split (ye poora binary tree ka downline count nahi hai).
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Left */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-text-secondary">Left leg</span>
                  </div>
                  <Badge variant="info" size="sm">{leftCount}</Badge>
                </div>
                <Progress
                  value={leftPercentage}
                  variant="primary"
                  size="lg"
                />
                <p className="text-xs text-text-muted mt-2">{leftPercentage.toFixed(1)}% of directs</p>
              </div>

              {/* Right */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-secondary">Right leg</span>
                    <ArrowRight className="h-4 w-4 text-orange-400" />
                  </div>
                  <Badge variant="warning" size="sm">{rightCount}</Badge>
                </div>
                <Progress
                  value={rightPercentage}
                  variant="gold"
                  size="lg"
                />
                <p className="text-xs text-text-muted mt-2">{rightPercentage.toFixed(1)}% of directs</p>
              </div>

              {unplacedCount > 0 && (
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-secondary">Leg pending</span>
                    <Badge variant="secondary" size="sm">{unplacedCount}</Badge>
                  </div>
                  <Progress
                    value={unplacedPercentage}
                    variant="success"
                    size="lg"
                    className="opacity-80"
                  />
                  <p className="text-xs text-text-muted mt-2">{unplacedPercentage.toFixed(1)}% of directs</p>
                </div>
              )}
            </div>

            {/* Active Rate */}
            <div className="mt-4 pt-4 border-t border-card-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Active Rate</span>
                <Badge variant="success">{activePercentage.toFixed(1)}%</Badge>
              </div>
              <Progress
                value={activePercentage}
                variant="success"
                size="sm"
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
