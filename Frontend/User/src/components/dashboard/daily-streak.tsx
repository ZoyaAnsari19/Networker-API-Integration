'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Flame, Gift, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StreakDay {
  date: string;
  loggedIn: boolean;
}

interface DailyStreakProps {
  currentStreak: number;
  longestStreak: number;
  last7Days: StreakDay[];
}

export function DailyStreak({
  currentStreak,
  longestStreak,
  last7Days,
}: DailyStreakProps) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <Card className="p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/30">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Daily Streak</p>
                <p className="text-2xl font-bold text-text-primary">
                  {currentStreak} days
                </p>
              </div>
            </div>
            <Badge variant="warning" className="gap-1">
              <Gift className="h-3 w-3" />
              Keep going!
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            {/* 7-day calendar */}
            <div className="flex gap-2">
              {last7Days.map((day, index) => {
                const date = new Date(day.date);
                const dayName = dayNames[date.getDay()];
                const isToday = index === last7Days.length - 1;

                return (
                  <div key={day.date} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-text-muted uppercase">
                      {dayName}
                    </span>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 25,
                        delay: 0.5 + index * 0.05,
                      }}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all',
                        day.loggedIn
                          ? 'bg-primary text-white'
                          : 'bg-card-hover text-text-muted',
                        isToday && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      )}
                    >
                      {date.getDate()}
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Longest streak */}
            <div className="text-right">
              <p className="text-xs text-text-muted flex items-center gap-1 justify-end">
                <Calendar className="h-3 w-3" /> Longest
              </p>
              <p className="text-lg font-bold text-accent-gold">
                {longestStreak} days
              </p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
