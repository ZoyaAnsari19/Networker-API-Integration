'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ChevronDown,
  ChevronRight,
  UserPlus,
  TrendingUp,
  Crown,
  ArrowRight,
  ArrowLeft,
  Zap,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';
import type { NetworkTreeNodeData } from '@/lib/network-tree-types';

export type TreeNodeData = NetworkTreeNodeData;

export interface NetworkTreeVisualizerLegStats {
  leftCount: number;
  rightCount: number;
  matchingVolumeRupees: number;
  teamTotalMembers: number;
}

interface NetworkTreeVisualizerProps {
  rootNode: TreeNodeData;
  onNodeClick?: (node: TreeNodeData) => void;
  /** Full-page layout: larger canvas with two-axis scroll for deep trees */
  layout?: 'default' | 'full';
  legStats?: NetworkTreeVisualizerLegStats;
}

interface TreeNodeCardProps {
  node: TreeNodeData;
  depth: number;
  maxDepth: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  onNodeClick?: (node: TreeNodeData) => void;
  side: 'left' | 'right' | 'root';
  teamTotalMembers: number;
}

const rankColors: Record<string, { bg: string; text: string; border: string }> = {
  Starter: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' },
  Bronze: { bg: 'bg-amber-700/20', text: 'text-amber-600', border: 'border-amber-700/30' },
  Silver: { bg: 'bg-gray-400/20', text: 'text-gray-300', border: 'border-gray-400/30' },
  Gold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  Platinum: { bg: 'bg-platinum/20', text: 'text-platinum', border: 'border-platinum/30' },
  Diamond: { bg: 'bg-cyan-400/20', text: 'text-cyan-300', border: 'border-cyan-400/30' },
  Unassigned: { bg: 'bg-slate-600/20', text: 'text-slate-400', border: 'border-slate-600/30' },
};

function TreeNodeCard({
  node,
  depth,
  maxDepth,
  expandedNodes,
  onToggle,
  onNodeClick,
  side,
  teamTotalMembers,
}: TreeNodeCardProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isRoot = depth === 0;
  const canExpand = depth < maxDepth && hasChildren;
  const hasGrandchildren = node.children?.some(c => c.children && c.children.length > 0);

  const rankStyle = rankColors[node.rank] || rankColors.Starter;

  const sideStyles = {
    root: {
      card: 'from-primary/15 via-primary/5 to-transparent border-primary/40',
      progress: 'bg-primary',
      badge: 'bg-primary/20 text-primary',
      icon: 'text-primary',
    },
    left: {
      card: 'from-blue-500/10 to-blue-500/5 border-blue-500/30',
      progress: 'bg-blue-500',
      badge: 'bg-blue-500/20 text-blue-400',
      icon: 'text-blue-400',
    },
    right: {
      card: 'from-orange-500/10 to-orange-500/5 border-orange-500/30',
      progress: 'bg-orange-500',
      badge: 'bg-orange-500/20 text-orange-400',
      icon: 'text-orange-400',
    },
  };

  const style = sideStyles[side];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: depth * 0.05 }}
      className="relative flex flex-col items-center"
    >
      {/* Node Card */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onNodeClick?.(node)}
        className={cn(
          'w-full max-w-[280px] rounded-xl border bg-gradient-to-br p-4 cursor-pointer transition-all duration-200',
          style.card,
          isRoot && 'ring-2 ring-primary/50 shadow-lg shadow-primary/10',
          !isRoot && 'hover:shadow-md'
        )}
      >
        {/* Avatar & Info */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative">
            <Avatar size="lg" className="h-12 w-12">
              {node.avatar ? (
                <AvatarImage src={node.avatar} alt={node.name} />
              ) : (
                <AvatarFallback className={cn('text-sm', isRoot ? 'bg-primary text-white' : 'bg-card-hover')}>
                  {node.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              )}
            </Avatar>
            {node.isActive && (
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={cn('font-semibold truncate', isRoot ? 'text-primary' : 'text-text-primary')}>
                {node.name}
              </p>
              {isRoot && <Crown className="h-4 w-4 text-accent-gold flex-shrink-0" />}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge className={cn('text-[10px]', rankStyle.bg, rankStyle.text)}>
                {node.rank}
              </Badge>
              {!isRoot && (
                <Badge variant="outline" className={cn('text-[10px]', style.badge)}>
                  {side === 'left' ? '← LEFT' : 'RIGHT →'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-card-hover/50 rounded-lg p-2">
            <div className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5">
              <Users className="h-3 w-3" />
              <span>Members</span>
            </div>
            <p className="text-sm font-bold text-text-primary">{formatNumber(node.memberCount)}</p>
          </div>
          <div className="bg-card-hover/50 rounded-lg p-2">
            <div className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5">
              <TrendingUp className="h-3 w-3" />
              <span>Volume</span>
            </div>
            <p className="text-sm font-bold text-text-primary">{formatCurrency(node.volume, 0)}</p>
          </div>
        </div>

        {/* Direct & Downline */}
        {node.directMembers !== undefined && (
          <div className="flex items-center gap-2 text-[10px] text-text-muted mb-2 px-1">
            <span className="flex items-center gap-1">
              <UserPlus className="h-3 w-3" />
              Direct: {node.directMembers}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Downline: {node.totalDownline || 0}
            </span>
          </div>
        )}

        {/* Progress Bar */}
        {teamTotalMembers > 0 && (
          <div className="mb-2">
            <div className="flex justify-between text-[10px] text-text-muted mb-1">
              <span>% of Team</span>
              <span>
                {((node.memberCount / teamTotalMembers) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-card-hover rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min((node.memberCount / teamTotalMembers) * 100, 100)}%`,
                }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={cn('h-full rounded-full', style.progress)}
              />
            </div>
          </div>
        )}

        {/* Expand/Collapse Button */}
        {canExpand && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="w-full h-7 text-xs gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="h-3 w-3" />
                Collapse
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3" />
                Expand ({node.children?.length} branches)
                {hasGrandchildren && <span className="text-text-muted ml-1">(+{node.children?.reduce((acc, c) => acc + (c.children?.length || 0), 0)} sub)</span>}
              </>
            )}
          </Button>
        )}
      </motion.div>

      {/* Connector Line */}
      {hasChildren && isExpanded && (
        <div className="relative h-8 w-px bg-gradient-to-b from-card-border to-transparent mt-2" />
      )}

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {/* Horizontal connector line */}
            {node.children && node.children.length > 1 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] h-px bg-card-border" />
            )}

            <div className={cn(
              'flex gap-4 pt-2',
              node.children && node.children.length > 1 ? 'justify-center' : 'justify-start'
            )}>
              {node.children?.map((child, index) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Vertical connector */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-px h-2 bg-card-border" />

                  {/* Horizontal connector for each child */}
                  {node.children && node.children.length > 1 && (
                    <div className={cn(
                      'absolute -top-[2px] h-px bg-card-border',
                      index === 0 ? 'right-1/2 left-0' : 'left-1/2 right-0'
                    )} />
                  )}

                  <TreeNodeCard
                    node={child}
                    depth={depth + 1}
                    maxDepth={maxDepth}
                    expandedNodes={expandedNodes}
                    onToggle={onToggle}
                    onNodeClick={onNodeClick}
                    side={index === 0 ? 'left' : 'right'}
                    teamTotalMembers={teamTotalMembers}
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

export function NetworkTreeVisualizer({
  rootNode,
  onNodeClick,
  layout = 'default',
  legStats,
}: NetworkTreeVisualizerProps) {
  const teamTotalMembers = Math.max(legStats?.teamTotalMembers ?? 1, 1);
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(
    () => new Set([rootNode.id]),
  );

  React.useEffect(() => {
    setExpandedNodes(new Set([rootNode.id]));
  }, [rootNode.id]);
  const [maxDepth, setMaxDepth] = React.useState(layout === 'full' ? 6 : 3);
  const [zoom, setZoom] = React.useState(layout === 'full' ? 0.85 : 1);
  const [selectedFilter, setSelectedFilter] = React.useState('all');

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (node: TreeNodeData) => {
      allIds.add(node.id);
      node.children?.forEach(collectIds);
    };
    collectIds(rootNode);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set([rootNode.id]));
  };

  // Count total nodes
  const countNodes = (node: TreeNodeData): number => {
    return 1 + (node.children?.reduce((sum, child) => sum + countNodes(child), 0) || 0);
  };

  const totalNodes = countNodes(rootNode);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-card border border-card-border">
        <div className="flex items-center gap-3">
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
              <SelectItem value="direct">Direct Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={String(maxDepth)} onValueChange={(v) => setMaxDepth(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <Layers className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Level 1</SelectItem>
              <SelectItem value="2">Level 2</SelectItem>
              <SelectItem value="3">Level 3</SelectItem>
              <SelectItem value="4">Level 4</SelectItem>
              <SelectItem value="5">Level 5</SelectItem>
              <SelectItem value="6">All levels</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll} className="gap-2">
            <Maximize2 className="h-4 w-4" />
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="gap-2">
            <ChevronDown className="h-4 w-4" />
            Collapse
          </Button>

          <div className="flex items-center gap-1 ml-4">
            <Button variant="ghost" size="icon-sm" onClick={() => setZoom(z => Math.max(0.35, z - 0.1))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-text-muted w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setZoom(z => Math.min(layout === 'full' ? 2.25 : 1.5, z + 0.1))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tree Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <Users className="h-4 w-4" />
            <span className="text-sm">Total Members</span>
          </div>
          <p className="text-xl font-bold text-primary mt-1">{formatNumber(totalNodes)}</p>
        </div>
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-400">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Left Leg</span>
          </div>
          <p className="text-xl font-bold text-blue-400 mt-1">
            {formatNumber(legStats?.leftCount ?? 0)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2 text-orange-400">
            <span className="text-sm">Right Leg</span>
            <ArrowRight className="h-4 w-4" />
          </div>
          <p className="text-xl font-bold text-orange-400 mt-1">
            {formatNumber(legStats?.rightCount ?? 0)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-accent-gold/10 border border-accent-gold/20">
          <div className="flex items-center gap-2 text-accent-gold">
            <Zap className="h-4 w-4" />
            <span className="text-sm">Matching</span>
          </div>
          <p className="text-xl font-bold text-accent-gold mt-1">
            {formatCurrency(legStats?.matchingVolumeRupees ?? 0, 0)}
          </p>
        </div>
      </div>

      {/* Tree Visualization */}
      <Card className="p-0 overflow-hidden">
        <CardContent
          className={cn(
            'p-6',
            layout === 'full'
              ? 'min-h-[min(85dvh,calc(100dvh-10rem))] max-h-[min(85dvh,calc(100dvh-10rem))] overflow-auto'
              : 'min-h-[600px] overflow-x-auto'
          )}
        >
          <motion.div
            style={{ scale: zoom, transformOrigin: 'top center' }}
            className="flex min-w-min flex-col items-center pb-4"
          >
            <TreeNodeCard
              node={rootNode}
              depth={0}
              maxDepth={maxDepth}
              expandedNodes={expandedNodes}
              onToggle={toggleExpand}
              onNodeClick={onNodeClick}
              side="root"
              teamTotalMembers={teamTotalMembers}
            />
          </motion.div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-8 pt-4 border-t border-card-border">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-xs text-text-muted">Left Leg</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <span className="text-xs text-text-muted">Root / You</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <span className="text-xs text-text-muted">Right Leg</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-xs text-text-muted">Online</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
