'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils';
import type { DailyEarnings } from '@/hooks/use-dashboard-data';

type TimeRange = '7d' | '30d' | '90d';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string; name: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-card-border bg-card p-3 shadow-lg space-y-1">
        <p className="text-xs text-text-muted">{label}</p>
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-xs text-text-secondary">{p.name}:</span>
            <span className="text-sm font-semibold text-text-primary">
              {formatCurrency(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface EarningsChartProps {
  data?: DailyEarnings[];
  loading?: boolean;
}

export function EarningsChart({ data = [], loading = false }: EarningsChartProps) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>('30d');
  const [isAnimating, setIsAnimating] = React.useState(false);

  const sliceCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const chartData = React.useMemo(
    () => data.slice(-sliceCount),
    [data, sliceCount],
  );

  const totals = React.useMemo(() => {
    return chartData.reduce(
      (acc, d) => {
        acc.direct += d.direct;
        acc.binary += d.binary;
        return acc;
      },
      { direct: 0, binary: 0 },
    );
  }, [chartData]);

  const totalEarnings = totals.direct + totals.binary;

  const handleTimeRangeChange = (range: TimeRange) => {
    if (range !== timeRange) {
      setIsAnimating(true);
      setTimeout(() => {
        setTimeRange(range);
        setIsAnimating(false);
      }, 150);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="p-0 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-6 pb-0">
          <div>
            <CardTitle className="text-lg">Earnings Overview</CardTitle>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs text-text-secondary">Direct</span>
                <span className="text-xs font-semibold text-text-primary">
                  {formatCurrencyCompact(totals.direct)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-accent-gold" />
                <span className="text-xs text-text-secondary">Binary</span>
                <span className="text-xs font-semibold text-text-primary">
                  {formatCurrencyCompact(totals.binary)}
                </span>
              </div>
              <div className="text-xs text-text-muted">
                Total: <span className="font-semibold text-text-primary">{formatCurrencyCompact(totalEarnings)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1 bg-card-hover rounded-lg p-1">
            {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant="ghost"
                size="sm"
                onClick={() => handleTimeRangeChange(range)}
                className={cn(
                  'h-7 px-3 text-xs font-medium',
                  timeRange === range && 'bg-primary text-white',
                )}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <motion.div
              className="h-[300px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: isAnimating ? 0 : 1 }}
              transition={{ duration: 0.15 }}
            >
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="directGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="binaryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dateLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#888', fontSize: 12 }}
                    dy={10}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#888', fontSize: 12 }}
                    tickFormatter={(value) =>
                      value >= 1000
                        ? `₹${(value / 1000).toFixed(0)}k`
                        : `₹${value}`
                    }
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={0}
                    wrapperStyle={{ display: 'none' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="direct"
                    name="Direct"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#directGradient)"
                    animationDuration={500}
                  />
                  <Area
                    type="monotone"
                    dataKey="binary"
                    name="Binary"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#binaryGradient)"
                    animationDuration={500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
