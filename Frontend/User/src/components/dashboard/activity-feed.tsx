'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus,
  TrendingUp,
  Banknote,
  Package,
  ArrowLeftRight,
  LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatCurrency } from '@/lib/utils';
import { RelativeTime } from '@/components/ui/relative-time';
import { Activity } from '@/lib/dummy-data';

const activityIcons: Record<string, LucideIcon> = {
  join: UserPlus,
  income: TrendingUp,
  withdrawal: Banknote,
  upgrade: Package,
  transfer: ArrowLeftRight,
};

const activityColors: Record<string, string> = {
  join: 'text-green-400 bg-green-500/20',
  income: 'text-primary bg-primary/20',
  withdrawal: 'text-accent-red bg-accent-red/20',
  upgrade: 'text-accent-gold bg-accent-gold/20',
  transfer: 'text-accent-blue bg-accent-blue/20',
};

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
    >
      <Card className="p-0">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <button className="text-sm text-primary hover:underline">
              View all
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            {activities.map((activity, index) => {
              const Icon = activityIcons[activity.type] || TrendingUp;
              const colorClass = activityColors[activity.type] || 'text-text-muted bg-card-hover';

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                  className="flex items-start gap-4 px-6 py-4 border-b border-card-border last:border-0 hover:bg-card-hover/50 transition-colors cursor-pointer"
                >
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colorClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text-primary truncate">
                        {activity.title}
                      </span>
                      {activity.amount && (
                        <Badge
                          variant={activity.amount > 0 ? 'success' : 'danger'}
                          size="sm"
                        >
                          {activity.amount > 0 ? '+' : ''}
                          {formatCurrency(activity.amount)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary truncate">
                      {activity.description}
                    </p>
                    <RelativeTime
                      value={activity.timestamp}
                      className="text-xs text-text-muted mt-1 block"
                    />
                  </div>
                  {activity.user && (
                    <Avatar size="sm">
                      <AvatarImage src={activity.user.avatar} />
                      <AvatarFallback>
                        {activity.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
