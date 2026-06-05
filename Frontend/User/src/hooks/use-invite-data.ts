'use client';

import * as React from 'react';
import { ApiError } from '@/lib/api-client';
import { devError, devLog } from '@/lib/dev-log';
import { fetchInvitePageData } from '@/lib/invite-api';
import type {
  DirectReferral,
  InviteProfile,
  InviteStatsSummary,
} from '@/lib/invite-types';

export type { DirectReferral, InviteProfile, InviteStatsSummary } from '@/lib/invite-types';

const emptyStats: InviteStatsSummary = {
  totalInvited: 0,
  activeUsers: 0,
  pendingPlacements: 0,
  totalCommission: 0,
  leftCount: 0,
  rightCount: 0,
  unplacedCount: 0,
};

export interface InviteData {
  profile: InviteProfile | null;
  referrals: DirectReferral[];
  stats: InviteStatsSummary;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useInviteData(): InviteData {
  const [profile, setProfile] = React.useState<InviteProfile | null>(null);
  const [referrals, setReferrals] = React.useState<DirectReferral[]>([]);
  const [stats, setStats] = React.useState<InviteStatsSummary>(emptyStats);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      devLog('Invite', 'Loading from API…');
      const data = await fetchInvitePageData();
      setProfile(data.profile);
      setReferrals(data.referrals);
      setStats(data.stats);
      devLog('Invite', 'Loaded (API)', {
        referrals: data.referrals.length,
        pending_placements: data.stats.pendingPlacements,
      });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load invite data';
      devError('Invite', message, e);
      setError(message);
      setProfile(null);
      setReferrals([]);
      setStats(emptyStats);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return {
    profile,
    referrals,
    stats,
    loading,
    error,
    refresh: load,
  };
}
