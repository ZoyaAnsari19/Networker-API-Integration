'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  Users,
  ChevronRight,
  X,
  TrendingUp,
  Award,
  Crown,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  NetworkTreeVisualizer,
  type TreeNodeData,
} from '@/components/team/network-tree-visualizer';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';
import { useNetworkTreeData } from '@/hooks/use-network-tree-data';

const RANK_COLORS: Record<string, string> = {
  Starter: 'bg-slate-500',
  Bronze: 'bg-amber-700',
  Silver: 'bg-gray-400',
  Gold: 'bg-yellow-500',
  Platinum: 'bg-gray-300',
  Diamond: 'bg-cyan-400',
  Unassigned: 'bg-slate-600',
};

export default function NetworkTreePage() {
  const {
    rootNode,
    stats,
    packageRanks,
    leftTop,
    rightTop,
    profilePackage,
    loading,
    error,
    refresh,
  } = useNetworkTreeData();

  const [selectedMember, setSelectedMember] = useState<TreeNodeData | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState('tree');

  const legs = stats?.legs;
  const totalVolume = stats?.totalVolumeRupees ?? 0;
  const totalMembers = stats?.totalMembers ?? 0;
  const activeMembers = stats?.activeMembers ?? 0;
  const matchingVolume = legs?.matchingVolumeRupees ?? 0;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 p-6 border border-primary/20"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20">
              <Network className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                Network Tree
              </h2>
              <p className="text-text-secondary mt-1">
                Live binary tree from your account — zoom, scroll, and expand
                each level.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profilePackage && (
              <Badge variant="success" className="gap-1 hidden md:flex">
                <Crown className="h-3 w-3" />
                {profilePackage}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refresh()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw
                className={cn('h-4 w-4', loading && 'animate-spin')}
              />
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Network',
            value: formatNumber(totalMembers),
            icon: Users,
            color: 'text-primary',
            bg: 'bg-primary/10',
          },
          {
            label: 'Active Members',
            value: formatNumber(activeMembers),
            icon: Award,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
          },
          {
            label: 'Total Volume',
            value: formatCurrency(totalVolume, 0),
            icon: TrendingUp,
            color: 'text-accent-blue',
            bg: 'bg-accent-blue/10',
          },
          {
            label: 'Binary Match',
            value: formatCurrency(matchingVolume, 0),
            icon: Network,
            color: 'text-accent-gold',
            bg: 'bg-accent-gold/10',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-0" hover>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl',
                      stat.bg,
                    )}
                  >
                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">{stat.label}</p>
                    <p className="text-lg font-bold number-counter">
                      {loading && !stats ? '…' : stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="tree" className="gap-2">
            <Network className="h-4 w-4" />
            Tree View
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="leg-summary" className="gap-2">
            <Users className="h-4 w-4" />
            Leg Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="mt-6 flex flex-col min-h-0">
          {loading && !rootNode ? (
            <div className="rounded-xl border border-card-border bg-card p-12 text-center text-sm text-text-secondary">
              Loading network tree…
            </div>
          ) : rootNode ? (
            <NetworkTreeVisualizer
              layout="full"
              rootNode={rootNode}
              onNodeClick={(node) => setSelectedMember(node)}
              legStats={
                legs
                  ? {
                      leftCount: legs.leftCount,
                      rightCount: legs.rightCount,
                      matchingVolumeRupees: legs.matchingVolumeRupees,
                      teamTotalMembers: totalMembers,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="rounded-xl border border-card-border bg-card p-12 text-center text-sm text-text-secondary">
              No tree data yet. Add members and place them in your binary legs.
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-0">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Volume Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {totalVolume > 0 && legs ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-blue-500" />
                          <span className="text-sm text-text-secondary">
                            Left Leg
                          </span>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatCurrency(legs.leftVolumeRupees, 0)}
                        </span>
                      </div>
                      <div className="h-3 bg-card-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${(legs.leftVolumeRupees / totalVolume) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        {formatNumber(legs.leftCount)} members •{' '}
                        {((legs.leftVolumeRupees / totalVolume) * 100).toFixed(
                          1,
                        )}
                        %
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-orange-500" />
                          <span className="text-sm text-text-secondary">
                            Right Leg
                          </span>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatCurrency(legs.rightVolumeRupees, 0)}
                        </span>
                      </div>
                      <div className="h-3 bg-card-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{
                            width: `${(legs.rightVolumeRupees / totalVolume) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        {formatNumber(legs.rightCount)} members •{' '}
                        {(
                          (legs.rightVolumeRupees / totalVolume) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">
                    No leg volume recorded yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="p-0">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent-gold" />
                  Package Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {packageRanks.length > 0 ? (
                  <div className="space-y-3">
                    {packageRanks.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={cn(
                            'h-3 w-3 rounded-full',
                            RANK_COLORS[item.label] ?? RANK_COLORS.Unassigned,
                          )}
                        />
                        <span className="text-sm text-text-secondary flex-1">
                          {item.label}
                        </span>
                        <span className="text-sm font-semibold">
                          {formatNumber(item.count)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">
                    No downline in tree yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="p-0 lg:col-span-2">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-secondary-light" />
                  Network Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'New This Week',
                      value: formatNumber(stats?.newThisWeek ?? 0),
                      sub: 'joined in last 7 days',
                    },
                    {
                      label: 'Left Leg Active',
                      value: formatNumber(legs?.leftActive ?? 0),
                      sub: 'ACTIVE in left subtree',
                    },
                    {
                      label: 'Right Leg Active',
                      value: formatNumber(legs?.rightActive ?? 0),
                      sub: 'ACTIVE in right subtree',
                    },
                    {
                      label: 'Matching Volume',
                      value: formatCurrency(matchingVolume, 0),
                      sub: 'weaker leg BV (rupees)',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-4 rounded-xl bg-card-hover"
                    >
                      <p className="text-sm text-text-muted">{item.label}</p>
                      <p className="text-lg font-bold text-text-primary mt-1">
                        {item.value}
                      </p>
                      <p className="text-xs text-text-muted mt-1">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leg-summary" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LegSummaryCard
              side="left"
              count={legs?.leftCount ?? 0}
              volume={legs?.leftVolumeRupees ?? 0}
              active={legs?.leftActive ?? 0}
              top={leftTop}
            />
            <LegSummaryCard
              side="right"
              count={legs?.rightCount ?? 0}
              volume={legs?.rightVolumeRupees ?? 0}
              active={legs?.rightActive ?? 0}
              top={rightTop}
            />
          </div>
        </TabsContent>
      </Tabs>

      <AnimatePresence>
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSelectedMember(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="radix-overlay-surface w-full max-w-md rounded-2xl border border-card-border p-6 shadow-xl ring-1 ring-black/20 dark:ring-white/10"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Avatar size="xl" className="h-16 w-16">
                    <AvatarFallback className="text-xl">
                      {selectedMember.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">
                      {selectedMember.name}
                    </h3>
                    <Badge variant="gold" size="sm" className="mt-1">
                      {selectedMember.rank}
                    </Badge>
                    <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          selectedMember.isActive
                            ? 'bg-green-500'
                            : 'bg-gray-500',
                        )}
                      />
                      {selectedMember.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelectedMember(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-card-hover">
                  <p className="text-xs text-text-muted flex items-center gap-1">
                    <Users className="h-3 w-3" /> Downline
                  </p>
                  <p className="text-lg font-bold text-text-primary mt-1">
                    {formatNumber(selectedMember.memberCount)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-card-hover">
                  <p className="text-xs text-text-muted flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Volume
                  </p>
                  <p className="text-lg font-bold text-text-primary mt-1">
                    {formatCurrency(selectedMember.volume, 0)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedMember(null)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LegSummaryCard({
  side,
  count,
  volume,
  active,
  top,
}: {
  side: 'left' | 'right';
  count: number;
  volume: number;
  active: number;
  top: { name: string; packageLabel: string }[];
}) {
  const isLeft = side === 'left';
  return (
    <Card className={cn('p-0', isLeft ? 'border-blue-500/30' : 'border-orange-500/30')}>
      <CardHeader
        className={cn(
          'p-6 pb-4',
          isLeft
            ? 'bg-gradient-to-r from-blue-500/10 to-transparent'
            : 'bg-gradient-to-r from-orange-500/10 to-transparent',
        )}
      >
        <div className="flex items-center justify-between">
          <CardTitle
            className={cn(
              'text-lg flex items-center gap-2',
              isLeft ? 'text-blue-400' : 'text-orange-400',
            )}
          >
            {isLeft && <ChevronRight className="h-5 w-5 rotate-180" />}
            {isLeft ? 'Left' : 'Right'} Leg
            {!isLeft && <ChevronRight className="h-5 w-5" />}
          </CardTitle>
          <Badge variant={isLeft ? 'info' : 'warning'}>
            {formatNumber(count)} members
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div
              className={cn(
                'p-3 rounded-lg',
                isLeft ? 'bg-blue-500/10' : 'bg-orange-500/10',
              )}
            >
              <p className="text-xs text-text-muted">Leg Volume</p>
              <p
                className={cn(
                  'text-xl font-bold',
                  isLeft ? 'text-blue-400' : 'text-orange-400',
                )}
              >
                {formatCurrency(volume, 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <p className="text-xs text-text-muted">Active in subtree</p>
              <p className="text-xl font-bold text-green-400">
                {formatNumber(active)}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-card-hover">
            <p className="text-sm text-text-muted mb-2">Top by node volume</p>
            {top.length > 0 ? (
              <div className="space-y-2">
                {top.map((person, i) => (
                  <div key={`${person.name}-${i}`} className="flex items-center gap-3">
                    <span className="text-xs text-text-muted w-4">{i + 1}.</span>
                    <Avatar size="sm">
                      <AvatarFallback className="text-xs">
                        {person.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1">{person.name}</span>
                    <Badge variant={isLeft ? 'info' : 'warning'} size="sm">
                      {person.packageLabel}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No members on this leg.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
