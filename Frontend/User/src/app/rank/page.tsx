'use client';

import { motion } from 'framer-motion';
import { Trophy, Target, Star, ChevronRight, Check, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ranks, currentUser } from '@/lib/dummy-data';
import { cn } from '@/lib/utils';

export default function RankPage() {
  const currentRank = ranks.find((r) => r.name === currentUser.rank) || ranks[2];
  const nextRank = ranks.find((r) => r.level === currentRank.level + 1);

  return (
    <div className="relative min-h-[min(72vh,840px)]">
      <div className="space-y-6 blur-[3px] brightness-[0.92]">
      {/* Current Rank Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-br from-accent-gold/30 via-accent-gold/10 to-transparent p-8 border border-accent-gold/30"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="relative"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent-gold to-accent-gold-light shadow-lg shadow-accent-gold/30">
                <span className="text-5xl">{currentRank.icon}</span>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-accent-gold/30 border-dashed"
              />
            </motion.div>
            <div>
              <Badge variant="gold" size="lg" className="mb-2">
                Current Rank
              </Badge>
              <h2 className="text-3xl font-bold gradient-text-gold">
                {currentRank.name}
              </h2>
              <p className="text-text-secondary mt-1">
                Level {currentRank.level} • {currentUser.package} Package
              </p>
            </div>
          </div>

          {nextRank && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-card-border">
              <div className="text-right">
                <p className="text-xs text-text-muted">Next Rank</p>
                <p className="text-lg font-bold text-text-primary">
                  {nextRank.icon} {nextRank.name}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-text-muted" />
            </div>
          )}
        </div>
      </motion.div>

      {/* Progress to Next Rank */}
      {nextRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="p-0">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Progress to {nextRank.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-text-muted">Current Progress</p>
                  <p className="text-3xl font-bold text-text-primary">
                    {currentRank.currentProgress}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-muted">Required PV</p>
                  <p className="text-lg font-semibold text-text-secondary">
                    ${nextRank.requiredPV.toLocaleString()}
                  </p>
                </div>
              </div>

              <Progress
                value={currentRank.currentProgress}
                variant="gold"
                size="xl"
                animated
                className="[&>div]:shadow-lg [&>div]:shadow-accent-gold/30"
              />

              <div className="flex justify-between text-xs text-text-muted pt-2">
                <span>{currentRank.name}</span>
                <span>{nextRank.name}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Benefits Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Benefits */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="p-0 h-full">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent-gold" />
                {currentRank.name} Benefits
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <ul className="space-y-3">
                {currentRank.benefits.map((benefit, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-text-secondary">{benefit}</span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Next Rank Benefits */}
        {nextRank && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card className="p-0 h-full border-accent-gold/30 bg-gradient-to-br from-card to-accent-gold/5">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-accent-gold" />
                  {nextRank.name} Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <ul className="space-y-3">
                  {nextRank.benefits.map((benefit, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-gold/20">
                        <Star className="h-3 w-3 text-accent-gold" />
                      </div>
                      <span className="text-text-secondary">{benefit}</span>
                    </motion.li>
                  ))}
                </ul>

                <Button className="w-full mt-6 gap-2" variant="gold">
                  <Zap className="h-4 w-4" />
                  Upgrade to {nextRank.name}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* All Ranks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="p-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg">Rank Progression</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {ranks.map((rank, index) => {
                const isCurrent = rank.level === currentRank.level;
                const isUnlocked = rank.level <= currentRank.level;

                return (
                  <motion.div
                    key={rank.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                      isCurrent
                        ? 'bg-primary/10 border-primary/30 scale-105'
                        : isUnlocked
                        ? 'bg-card-hover border-card-border'
                        : 'bg-card border-card-border opacity-60'
                    )}
                  >
                    <span className="text-3xl">{rank.icon}</span>
                    <span className={cn(
                      'text-sm font-semibold',
                      isCurrent ? 'text-primary' : 'text-text-secondary'
                    )}>
                      {rank.name}
                    </span>
                    <Badge variant={isUnlocked ? 'success' : 'outline'} size="sm">
                      {isUnlocked ? 'Unlocked' : `$${(rank.requiredPV / 1000).toFixed(0)}K`}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      </div>

      <div
        className="absolute inset-0 z-10 flex items-center justify-center p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rank-coming-soon-title"
        aria-describedby="rank-coming-soon-desc"
      >
        <div
          className="absolute inset-0 bg-background/55 backdrop-blur-md dark:bg-background/70"
          aria-hidden
        />
        <div className="relative z-20 max-w-md rounded-2xl border border-primary/25 bg-card/90 px-8 py-10 text-center shadow-2xl shadow-black/20 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Rank &amp; Progress</p>
          <h1 id="rank-coming-soon-title" className="mt-3 text-3xl font-bold tracking-tight text-text-primary">
            Coming soon
          </h1>
          <p id="rank-coming-soon-desc" className="mt-3 text-sm leading-relaxed text-text-secondary">
            This section is under construction. Check back later for live rank tracking and benefits.
          </p>
        </div>
      </div>
    </div>
  );
}
