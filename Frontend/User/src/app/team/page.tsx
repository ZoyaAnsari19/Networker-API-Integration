'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users,
  ArrowLeft,
  ArrowRight,
  Network,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants, Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TeamStats, TeamList } from '@/components/team';
import { useTeamData } from '@/hooks/use-team-data';

export default function TeamPage() {
  const { stats, left, right, loading, error, refresh } = useTeamData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-secondary/20 to-primary/20 p-6 border border-secondary/20"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/20">
              <Users className="h-7 w-7 text-secondary-light" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                Your Network Team
              </h2>
              <p className="text-text-secondary mt-1">
                Live binary downline — left/right members, status, and BV flowing through each node.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refresh()}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Team Stats (real) */}
      <TeamStats
        totalMembers={stats.total_members}
        activeToday={stats.active_members}
        newThisWeek={stats.new_this_week}
        totalVolume={stats.total_volume / 100}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden border-primary/25 bg-gradient-to-r from-primary/10 via-card to-secondary/10">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Full network tree</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Open the dedicated view for zoom, all levels, and the full binary path from root to leaves.
                </p>
              </div>
            </div>
            <Link
              href="/network-tree"
              className={cn(buttonVariants({ variant: 'default' }), 'shrink-0 gap-2')}
            >
              View network tree
              <ChevronRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Team Lists */}
      <Tabs defaultValue="left" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="left" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Left Team ({stats.left_count})
          </TabsTrigger>
          <TabsTrigger value="right" className="gap-2">
            Right Team ({stats.right_count})
            <ArrowRight className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="left">
          <TeamList side="left" members={left} loading={loading} />
        </TabsContent>

        <TabsContent value="right">
          <TeamList side="right" members={right} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
