'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';

interface VolumeComparisonProps {
  leftVolume: number;
  rightVolume: number;
  leftCount: number;
  rightCount: number;
}

export function VolumeComparison({
  leftVolume,
  rightVolume,
  leftCount,
  rightCount,
}: VolumeComparisonProps) {
  const totalVolume = leftVolume + rightVolume;
  const leftPercentage = (leftVolume / totalVolume) * 100;
  const rightPercentage = (rightVolume / totalVolume) * 100;

  const matchingVolume = Math.min(leftVolume, rightVolume);
  const isBalanced = Math.abs(leftPercentage - rightPercentage) < 15;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="p-0">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Team Volume
            {isBalanced && (
              <Badge variant="success" size="sm" className="gap-1">
                <Zap className="h-3 w-3" /> Balanced
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 pt-0 space-y-6">
          {/* Volume Bars */}
          <div className="space-y-3">
            {/* Left Volume */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-text-secondary">Left Leg</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-text-primary">
                    {formatCurrency(leftVolume, 0)}
                  </p>
                  <p className="text-xs text-text-muted">{leftCount} members</p>
                </div>
              </div>
              <Progress
                value={leftPercentage}
                variant="primary"
                size="lg"
                className="[&>div]:bg-blue-500"
              />
            </div>

            {/* Right Volume */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-secondary">Right Leg</span>
                  <ArrowRight className="h-4 w-4 text-orange-400" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-text-primary">
                    {formatCurrency(rightVolume, 0)}
                  </p>
                  <p className="text-xs text-text-muted">{rightCount} members</p>
                </div>
              </div>
              <Progress
                value={rightPercentage}
                variant="gold"
                size="lg"
                className="[&>div]:bg-orange-500"
              />
            </div>
          </div>

          {/* Matching Info */}
          <div className="rounded-xl bg-card-hover p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Matching Volume</span>
              <Badge variant="primary">{formatCurrency(matchingVolume, 0)}</Badge>
            </div>
            <p className="text-xs text-text-muted">
              This is the volume eligible for binary matching bonus
            </p>
          </div>

          {/* Binary Bonus Preview */}
          <div className="rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 p-4 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-text-primary">Binary Bonus Rate</span>
            </div>
            <p className="text-2xl font-bold text-primary">10%</p>
            <p className="text-xs text-text-muted mt-1">
              Potential bonus: {formatCurrency(matchingVolume * 0.1, 0)}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
