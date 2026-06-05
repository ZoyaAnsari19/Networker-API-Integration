'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RelativeTime } from '@/components/ui/relative-time';
import type { DirectReferral } from '@/lib/invite-types';

interface RecentInvitesProps {
  referrals: DirectReferral[];
  loading?: boolean;
}

type Filter = 'all' | 'active' | 'pending';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function RecentInvites({ referrals, loading }: RecentInvitesProps) {
  const [filter, setFilter] = React.useState<Filter>('all');

  const filtered = referrals.filter((r) => {
    if (filter === 'active') return r.status === 'ACTIVE';
    if (filter === 'pending')
      return (
        r.placement_status === 'PENDING_PLACEMENT' || r.status === 'INACTIVE'
      );
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="p-0">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Recent Invites
              {!loading && (
                <span className="text-sm font-normal text-text-muted">
                  ({referrals.length})
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              {(['all', 'active', 'pending'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="capitalize text-xs"
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-card-border">
            {filtered.map((r, index) => {
              const leg = r.leg?.toLowerCase() as 'left' | 'right' | undefined;
              const placementPending = r.placement_status === 'PENDING_PLACEMENT';
              return (
                <motion.div
                  key={r.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-card-hover/50 transition-colors"
                >
                  <Avatar size="md">
                    <AvatarFallback>{initials(r.full_name)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-text-primary truncate">
                        {r.full_name}
                      </p>
                      <Badge variant="primary" size="sm">
                        Direct
                      </Badge>
                      {r.package_name && (
                        <Badge variant="info" size="sm">
                          {r.package_name}
                        </Badge>
                      )}
                      <span className="text-xs font-mono text-text-muted">
                        {r.sponsor_id}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted truncate">
                      {r.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {placementPending ? (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-400">
                        <HelpCircle className="h-3 w-3" />
                        <span>PENDING</span>
                      </div>
                    ) : leg ? (
                      <div
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
                          leg === 'left'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-orange-500/10 text-orange-400',
                        )}
                      >
                        {leg === 'left' ? (
                          <ArrowLeft className="h-3 w-3" />
                        ) : (
                          <ArrowRight className="h-3 w-3" />
                        )}
                        <span className="uppercase">{leg}</span>
                      </div>
                    ) : null}

                    <Badge
                      variant={r.status === 'ACTIVE' ? 'success' : 'warning'}
                      size="sm"
                      className="gap-1"
                    >
                      {r.status === 'ACTIVE' ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {r.status.toLowerCase()}
                    </Badge>

                    <RelativeTime
                      value={r.created_at}
                      className="text-xs text-text-muted hidden sm:inline"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center">
              <UserPlus className="h-12 w-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">
                {referrals.length === 0
                  ? 'No referrals yet — share your invite link to get started.'
                  : 'No invites found for this filter.'}
              </p>
            </div>
          )}

          {loading && (
            <div className="p-8 text-center text-text-muted text-sm">
              Loading referrals…
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
