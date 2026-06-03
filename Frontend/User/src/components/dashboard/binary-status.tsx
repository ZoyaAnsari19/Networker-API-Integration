'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Users, Activity, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface BinarySideProps {
  side: 'left' | 'right';
  count: number;
  volume: number;
  activeCount: number;
  percentage: number;
}

function BinarySide({ side, count, volume, activeCount, percentage }: BinarySideProps) {
  const isLeft = side === 'left';
  const color = isLeft ? 'text-blue-400' : 'text-orange-400';
  const borderColor = isLeft ? 'border-blue-500/30' : 'border-orange-500/30';
  const progressColor = isLeft ? 'primary' : 'gold';

  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className={cn(
        'flex-1 rounded-xl border p-4',
        borderColor,
        'bg-gradient-to-br from-card to-card-hover'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLeft ? (
            <ArrowLeft className={cn('h-5 w-5', color)} />
          ) : (
            <ArrowRight className={cn('h-5 w-5', color)} />
          )}
          <span className={cn('font-semibold', color)}>
            {isLeft ? 'LEFT' : 'RIGHT'}
          </span>
        </div>
        <Badge variant={isLeft ? 'info' : 'gold'} size="sm">
          {percentage.toFixed(1)}%
        </Badge>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-text-muted flex items-center gap-1">
              <Users className="h-3 w-3" /> Members
            </span>
            <span className="font-semibold text-text-primary">
              {formatNumber(count)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-text-muted flex items-center gap-1">
              <Activity className="h-3 w-3" /> Active
            </span>
            <span className="font-semibold text-primary">
              {formatNumber(activeCount)}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-text-muted">Volume</span>
            <span className="font-medium text-text-secondary">
              {formatCurrency(volume, 0)}
            </span>
          </div>
          <Progress
            value={percentage}
            variant={progressColor as 'primary' | 'gold'}
            size="sm"
          />
        </div>
      </div>
    </motion.div>
  );
}

interface BinaryStatusProps {
  leftCount: number;
  rightCount: number;
  leftVolume: number;
  rightVolume: number;
  leftActive: number;
  rightActive: number;
}

export function BinaryStatus({
  leftCount,
  rightCount,
  leftVolume,
  rightVolume,
  leftActive,
  rightActive,
}: BinaryStatusProps) {
  const totalCount = leftCount + rightCount;
  const totalVolume = leftVolume + rightVolume;
  const leftPercentage =
    totalCount > 0 ? (leftCount / totalCount) * 100 : 0;
  const rightPercentage =
    totalCount > 0 ? (rightCount / totalCount) * 100 : 0;

  const isBalanced = Math.abs(leftPercentage - rightPercentage) < 20;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <Card className="p-0 overflow-hidden">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              Binary Status
              {isBalanced && (
                <Badge variant="success" size="sm" className="gap-1">
                  <Zap className="h-3 w-3" /> Balanced
                </Badge>
              )}
            </CardTitle>
            <span className="text-xs text-text-muted">
              Total: {formatNumber(totalCount)} members
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex gap-4">
            <BinarySide
              side="left"
              count={leftCount}
              volume={leftVolume}
              activeCount={leftActive}
              percentage={leftPercentage}
            />
            <BinarySide
              side="right"
              count={rightCount}
              volume={rightVolume}
              activeCount={rightActive}
              percentage={rightPercentage}
            />
          </div>

          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-muted">Total Volume:</span>
              <span className="font-semibold text-text-primary">
                {formatCurrency(totalVolume, 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
