'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ChevronDown,
  ChevronRight,
  UserPlus,
  TrendingUp,
  Award,
  Crown,
  ArrowRight,
  ArrowLeft,
  Zap,
  Target,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';

interface TreeNode {
  id: string;
  name: string;
  avatar?: string;
  memberCount: number;
  volume: number;
  rank: string;
  children?: TreeNode[];
  isActive?: boolean;
  joinedAt?: string;
}

interface EnhancedBinaryTreeProps {
  leftNode: TreeNode;
  rightNode: TreeNode;
  rootName: string;
  rootAvatar?: string;
  rootRank: string;
  totalMembers: number;
  leftCount: number;
  rightCount: number;
  leftVolume: number;
  rightVolume: number;
}

interface NodeCardProps {
  node: TreeNode;
  depth: number;
  side: 'left' | 'right' | 'root';
  maxDepth?: number;
  onExpand?: (id: string) => void;
  expandedNodes: Set<string>;
}

function NodeCard({ node, depth, side, maxDepth = 3, onExpand, expandedNodes }: NodeCardProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isRoot = depth === 0;
  const showExpand = depth < maxDepth && hasChildren;

  const sideColors = {
    root: {
      bg: 'from-primary/20 to-secondary/20',
      border: 'border-primary/30',
      badge: 'bg-primary/20 text-primary',
      progress: 'bg-primary',
    },
    left: {
      bg: 'from-blue-500/10 to-blue-500/5',
      border: 'border-blue-500/30',
      badge: 'bg-blue-500/20 text-blue-400',
      progress: 'bg-blue-500',
    },
    right: {
      bg: 'from-orange-500/10 to-orange-500/5',
      border: 'border-orange-500/30',
      badge: 'bg-orange-500/20 text-orange-400',
      progress: 'bg-orange-500',
    },
  };

  const colors = sideColors[side];
  const memberPercentage = (node.memberCount / 1600) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: depth * 0.05 }}
      className="relative"
    >
      <div
        className={cn(
          'rounded-xl border p-4 transition-all duration-300',
          'bg-gradient-to-br',
          colors.bg,
          colors.border,
          isRoot && 'ring-2 ring-primary/50',
          'hover:shadow-lg hover:scale-[1.02]'
        )}
      >
        {/* Node Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <Avatar size="lg" className="h-12 w-12">
              {node.avatar ? (
                <AvatarImage src={node.avatar} alt={node.name} />
              ) : (
                <AvatarFallback className={cn('text-sm', isRoot ? 'bg-primary text-white' : 'bg-card-hover')}>
                  {node.name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              )}
            </Avatar>
            {node.isActive !== false && (
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={cn('font-semibold truncate', isRoot ? 'text-primary' : 'text-text-primary')}>
                {node.name}
              </p>
              {isRoot && <Crown className="h-4 w-4 text-accent-gold flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" size="sm" className={cn('text-[10px]', colors.badge)}>
                {node.rank}
              </Badge>
              {side !== 'root' && (
                <Badge variant="outline" size="sm" className="text-[10px]">
                  {side === 'left' ? '← LEFT' : 'RIGHT →'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-text-muted flex items-center gap-1">
              <Users className="h-3 w-3" /> Members
            </span>
            <span className="font-semibold text-text-primary">{formatNumber(node.memberCount)}</span>
          </div>

          {!isRoot && (
            <div className="flex justify-between text-xs">
              <span className="text-text-muted flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Volume
              </span>
              <span className="font-semibold text-text-primary">{formatCurrency(node.volume, 0)}</span>
            </div>
          )}

          {/* Member Progress Bar */}
          <div className="mt-2">
            <div className="h-1.5 bg-card-hover rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(memberPercentage, 100)}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={cn('h-full rounded-full', colors.progress)}
              />
            </div>
            <p className="text-[10px] text-text-muted mt-1">
              {memberPercentage.toFixed(1)}% of team
            </p>
          </div>
        </div>

        {/* Expand Button */}
        {showExpand && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExpand?.(node.id)}
            className="w-full mt-3 h-7 text-xs gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="h-3 w-3" /> Collapse
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3" /> Expand ({node.children?.length} branches)
              </>
            )}
          </Button>
        )}
      </div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && node.children && node.children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4"
          >
            {/* Connector Line */}
            <div className="flex justify-center mb-2">
              <div className="h-6 w-px bg-gradient-to-b from-card-border to-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {node.children.map((child, index) => (
                <div key={child.id} className="relative">
                  {/* Horizontal Connector */}
                  <div className="absolute -top-6 left-1/2 w-px h-6 bg-card-border" />
                  {index === 0 && (
                    <div className="absolute -top-3 left-0 right-1/2 h-px bg-card-border" />
                  )}
                  {index === 1 && (
                    <div className="absolute -top-3 left-1/2 right-0 h-px bg-card-border" />
                  )}
                  <NodeCard
                    node={child}
                    depth={depth + 1}
                    side={index === 0 ? 'left' : 'right'}
                    maxDepth={maxDepth}
                    onExpand={onExpand}
                    expandedNodes={expandedNodes}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function EnhancedBinaryTree({
  leftNode,
  rightNode,
  rootName,
  rootAvatar,
  rootRank,
  totalMembers,
  leftCount,
  rightCount,
  leftVolume,
  rightVolume,
}: EnhancedBinaryTreeProps) {
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set(['root']));

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const matchingVolume = Math.min(leftVolume, rightVolume);
  const bonusPotential = matchingVolume * 0.1;

  return (
    <div className="space-y-6">
      {/* Tree Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
        >
          <p className="text-sm text-text-secondary">Total Network</p>
          <p className="text-2xl font-bold text-primary">{formatNumber(totalMembers)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20"
        >
          <div className="flex items-center gap-2 mb-1">
            <ArrowLeft className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-text-secondary">Left Leg</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{formatNumber(leftCount)}</p>
          <p className="text-xs text-text-muted">{formatCurrency(leftVolume, 0)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/20"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-text-secondary">Right Leg</span>
            <ArrowRight className="h-4 w-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-orange-400">{formatNumber(rightCount)}</p>
          <p className="text-xs text-text-muted">{formatCurrency(rightVolume, 0)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-4 rounded-xl bg-gradient-to-br from-accent-gold/20 to-accent-gold/5 border border-accent-gold/20"
        >
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-accent-gold" />
            <span className="text-sm text-text-secondary">Matching Bonus</span>
          </div>
          <p className="text-2xl font-bold text-accent-gold">{formatCurrency(bonusPotential, 0)}</p>
          <p className="text-xs text-text-muted">10% of {formatCurrency(matchingVolume, 0)}</p>
        </motion.div>
      </div>

      {/* Binary Tree Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-0 overflow-visible">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Network Tree
              </CardTitle>
              <Badge variant="success" className="gap-1">
                <Zap className="h-3 w-3" />
                Binary Structure
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Root Node */}
            <div className="max-w-md mx-auto mb-8">
              <NodeCard
                node={{
                  id: 'root',
                  name: rootName,
                  avatar: rootAvatar,
                  rank: rootRank,
                  memberCount: totalMembers,
                  volume: leftVolume + rightVolume,
                  children: [leftNode, rightNode],
                }}
                depth={0}
                side="root"
                maxDepth={2}
                onExpand={toggleExpand}
                expandedNodes={expandedNodes}
              />
            </div>

            {/* Level Indicators */}
            <div className="flex justify-center gap-8 mt-8">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm text-text-secondary">Level 1</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-sm text-text-secondary">Level 2</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Volume Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Volume Balance
              </h3>
              <Badge variant={Math.abs(leftVolume - rightVolume) < 500000 ? 'success' : 'warning'}>
                {Math.abs(leftVolume - rightVolume) < 500000 ? 'Balanced' : 'Unbalanced'}
              </Badge>
            </div>

            <div className="space-y-4">
              {/* Left Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">Left Leg</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-primary">{formatCurrency(leftVolume, 0)}</p>
                    <p className="text-xs text-text-muted">{formatNumber(leftCount)} members</p>
                  </div>
                </div>
                <div className="h-3 bg-card-hover rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(leftVolume / (leftVolume + rightVolume)) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
              </div>

              {/* Right Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-orange-400">Right Leg</span>
                    <ArrowRight className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-primary">{formatCurrency(rightVolume, 0)}</p>
                    <p className="text-xs text-text-muted">{formatNumber(rightCount)} members</p>
                  </div>
                </div>
                <div className="h-3 bg-card-hover rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(rightVolume / (leftVolume + rightVolume)) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="h-full bg-orange-500 rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Matching Info */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent-gold/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Matching Volume</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(matchingVolume, 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-secondary">Binary Bonus (10%)</p>
                  <p className="text-xl font-bold text-accent-gold">{formatCurrency(bonusPotential, 0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { icon: UserPlus, label: 'Active Members', value: leftCount + rightCount, color: 'text-green-400' },
          { icon: Award, label: 'Top Performer', value: 'Sarah M.', color: 'text-accent-gold' },
          { icon: Crown, label: 'Your Rank', value: rootRank, color: 'text-primary' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
          >
            <Card className="p-4" hover>
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-card-hover', stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-text-muted">{stat.label}</p>
                  <p className={cn('font-bold', stat.color)}>{stat.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
