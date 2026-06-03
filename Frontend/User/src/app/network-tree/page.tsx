'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  Users,
  ChevronRight,
  X,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  Award,
  Crown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NetworkTreeVisualizer, generateFullTree } from '@/components/team/network-tree-visualizer';
import { cn, formatNumber, formatCurrency, formatDate } from '@/lib/utils';
import { currentUser, binaryStatus } from '@/lib/dummy-data';

interface SelectedMember {
  id: string;
  name: string;
  avatar?: string;
  memberCount: number;
  volume: number;
  rank: string;
  rankLevel: number;
  isActive: boolean;
  joinedAt: string;
  directMembers?: number;
  totalDownline?: number;
  email?: string;
  phone?: string;
}

export default function NetworkTreePage() {
  const [selectedMember, setSelectedMember] = useState<SelectedMember | null>(null);
  const [activeTab, setActiveTab] = useState('tree');
  const treeData = useMemo(() => generateFullTree(), []);

  // Stats
  const totalMembers = binaryStatus.leftCount + binaryStatus.rightCount;
  const activeMembers = binaryStatus.leftActive + binaryStatus.rightActive;
  const totalVolume = binaryStatus.leftVolume + binaryStatus.rightVolume;
  const matchingVolume = Math.min(binaryStatus.leftVolume, binaryStatus.rightVolume);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 p-6 border border-primary/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20">
              <Network className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Network Tree</h2>
              <p className="text-text-secondary mt-1">
                Full-width binary tree: zoom, scroll, and expand from root through every level.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Badge variant="success" className="gap-1">
              <Crown className="h-3 w-3" />
              {currentUser.rank} Member
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Network', value: formatNumber(totalMembers), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Active Today', value: formatNumber(activeMembers), icon: Award, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Total Volume', value: formatCurrency(totalVolume, 0), icon: TrendingUp, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
          { label: 'Binary Match', value: formatCurrency(matchingVolume, 0), icon: Network, color: 'text-accent-gold', bg: 'bg-accent-gold/10' },
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
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', stat.bg)}>
                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">{stat.label}</p>
                    <p className="text-lg font-bold number-counter">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
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
          <NetworkTreeVisualizer
            layout="full"
            rootNode={treeData}
            onNodeClick={(node) => setSelectedMember(node as SelectedMember)}
          />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Volume Distribution */}
            <Card className="p-0">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Volume Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <span className="text-sm text-text-secondary">Left Leg</span>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(binaryStatus.leftVolume, 0)}</span>
                    </div>
                    <div className="h-3 bg-card-hover rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(binaryStatus.leftVolume / totalVolume) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {formatNumber(binaryStatus.leftCount)} members • {((binaryStatus.leftVolume / totalVolume) * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-orange-500" />
                        <span className="text-sm text-text-secondary">Right Leg</span>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(binaryStatus.rightVolume, 0)}</span>
                    </div>
                    <div className="h-3 bg-card-hover rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${(binaryStatus.rightVolume / totalVolume) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {formatNumber(binaryStatus.rightCount)} members • {((binaryStatus.rightVolume / totalVolume) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rank Distribution */}
            <Card className="p-0">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent-gold" />
                  Rank Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-3">
                  {[
                    { rank: 'Diamond', count: 2, color: 'bg-cyan-400' },
                    { rank: 'Platinum', count: 8, color: 'bg-gray-300' },
                    { rank: 'Gold', count: 45, color: 'bg-yellow-500' },
                    { rank: 'Silver', count: 156, color: 'bg-gray-400' },
                    { rank: 'Bronze', count: 423, color: 'bg-amber-700' },
                    { rank: 'Starter', count: 966, color: 'bg-slate-500' },
                  ].map((item) => (
                    <div key={item.rank} className="flex items-center gap-3">
                      <div className={cn('h-3 w-3 rounded-full', item.color)} />
                      <span className="text-sm text-text-secondary flex-1">{item.rank}</span>
                      <span className="text-sm font-semibold">{formatNumber(item.count)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card className="p-0 lg:col-span-2">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-secondary-light" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Today', joins: 3, volume: '$12,450' },
                    { label: 'This Week', joins: 18, volume: '$67,890' },
                    { label: 'This Month', joins: 67, volume: '$234,567' },
                    { label: 'All Time', joins: 1600, volume: '$4,349,135' },
                  ].map((item) => (
                    <div key={item.label} className="p-4 rounded-xl bg-card-hover">
                      <p className="text-sm text-text-muted">{item.label}</p>
                      <p className="text-lg font-bold text-text-primary mt-1">{formatNumber(item.joins)} joins</p>
                      <p className="text-sm text-primary font-semibold">{item.volume}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leg-summary" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Leg */}
            <Card className="p-0 border-blue-500/30">
              <CardHeader className="p-6 pb-4 bg-gradient-to-r from-blue-500/10 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 text-blue-400">
                    <ChevronRight className="h-5 w-5" />
                    Left Leg
                  </CardTitle>
                  <Badge variant="info">{formatNumber(binaryStatus.leftCount)} members</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <p className="text-xs text-text-muted">Total Volume</p>
                      <p className="text-xl font-bold text-blue-400">{formatCurrency(binaryStatus.leftVolume, 0)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <p className="text-xs text-text-muted">Active Members</p>
                      <p className="text-xl font-bold text-green-400">{formatNumber(binaryStatus.leftActive)}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-card-hover">
                    <p className="text-sm text-text-muted mb-2">Top Performers</p>
                    <div className="space-y-2">
                      {['Sarah Miller', 'Emily Chen', 'Lisa Anderson'].map((name, i) => (
                        <div key={name} className="flex items-center gap-3">
                          <span className="text-xs text-text-muted w-4">{i + 1}.</span>
                          <Avatar size="sm">
                            <AvatarFallback className="text-xs">{name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm flex-1">{name}</span>
                          <Badge variant="info" size="sm">{i === 0 ? 'Gold' : i === 1 ? 'Silver' : 'Silver'}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Leg */}
            <Card className="p-0 border-orange-500/30">
              <CardHeader className="p-6 pb-4 bg-gradient-to-r from-orange-500/10 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-400">
                    Right Leg
                    <ChevronRight className="h-5 w-5" />
                  </CardTitle>
                  <Badge variant="warning">{formatNumber(binaryStatus.rightCount)} members</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-orange-500/10">
                      <p className="text-xs text-text-muted">Total Volume</p>
                      <p className="text-xl font-bold text-orange-400">{formatCurrency(binaryStatus.rightVolume, 0)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <p className="text-xs text-text-muted">Active Members</p>
                      <p className="text-xl font-bold text-green-400">{formatNumber(binaryStatus.rightActive)}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-card-hover">
                    <p className="text-sm text-text-muted mb-2">Top Performers</p>
                    <div className="space-y-2">
                      {['James Wilson', 'Amanda Taylor', 'Jennifer Lee'].map((name, i) => (
                        <div key={name} className="flex items-center gap-3">
                          <span className="text-xs text-text-muted w-4">{i + 1}.</span>
                          <Avatar size="sm">
                            <AvatarFallback className="text-xs">{name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm flex-1">{name}</span>
                          <Badge variant="warning" size="sm">{i === 0 ? 'Silver' : i === 1 ? 'Bronze' : 'Gold'}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Member Detail Panel */}
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
                    {selectedMember.avatar ? (
                      <AvatarImage src={selectedMember.avatar} />
                    ) : (
                      <AvatarFallback className="text-xl">
                        {selectedMember.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-text-primary">{selectedMember.name}</h3>
                      {selectedMember.rank === 'Gold' && <Crown className="h-4 w-4 text-accent-gold" />}
                    </div>
                    <Badge variant="gold" size="sm" className="mt-1">{selectedMember.rank}</Badge>
                    <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                      <div className={cn(
                        'h-2 w-2 rounded-full',
                        selectedMember.isActive ? 'bg-green-500' : 'bg-gray-500'
                      )} />
                      {selectedMember.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setSelectedMember(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-card-hover">
                  <p className="text-xs text-text-muted flex items-center gap-1">
                    <Users className="h-3 w-3" /> Members
                  </p>
                  <p className="text-lg font-bold text-text-primary mt-1">{formatNumber(selectedMember.memberCount)}</p>
                </div>
                <div className="p-3 rounded-lg bg-card-hover">
                  <p className="text-xs text-text-muted flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Volume
                  </p>
                  <p className="text-lg font-bold text-text-primary mt-1">{formatCurrency(selectedMember.volume, 0)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-text-muted" />
                  <span className="text-text-secondary">Joined: {formatDate(selectedMember.joinedAt)}</span>
                </div>
                {selectedMember.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-text-muted" />
                    <span className="text-text-secondary">{selectedMember.email}</span>
                  </div>
                )}
                {selectedMember.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-text-muted" />
                    <span className="text-text-secondary">{selectedMember.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" className="flex-1">View Full Profile</Button>
                <Button className="flex-1">View Downline</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
