'use client';

import * as React from 'react';
import {
  mockDelay,
  mockDirectReferrals,
  mockMeProfile,
  mockPlacementRequests,
} from '@/lib/mock-api-data';
import { referralStats } from '@/lib/dummy-data';

export interface DirectReferral {
  user_id: string;
  sponsor_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  placement_status: 'PLACED' | 'PENDING_PLACEMENT';
  leg: 'LEFT' | 'RIGHT' | null;
  package_name: string | null;
  total_direct_earned: number;
  created_at: string;
}

export interface InviteProfile {
  user_id: string;
  sponsor_id: string;
  full_name: string;
  monthly_income_paise: number;
  direct_referral_count: number;
}

export interface InviteStatsSummary {
  totalInvited: number;
  activeUsers: number;
  pendingPlacements: number;
  totalCommission: number;
  leftCount: number;
  rightCount: number;
  unplacedCount: number;
}

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
  const [stats, setStats] = React.useState<InviteStatsSummary>({
    totalInvited: 0,
    activeUsers: 0,
    pendingPlacements: 0,
    totalCommission: 0,
    leftCount: 0,
    rightCount: 0,
    unplacedCount: 0,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await mockDelay();
      const me: InviteProfile = {
        user_id: mockMeProfile.user_id,
        sponsor_id: mockMeProfile.sponsor_id,
        full_name: mockMeProfile.full_name,
        monthly_income_paise: mockMeProfile.monthly_income_paise,
        direct_referral_count: mockMeProfile.direct_referral_count,
      };
      const refs = mockDirectReferrals;
      const activeCount = refs.filter((r) => r.status === 'ACTIVE').length;
      const leftDirectCount = refs.filter((r) => r.leg === 'LEFT').length;
      const rightDirectCount = refs.filter((r) => r.leg === 'RIGHT').length;
      const unplacedDirectCount = refs.filter((r) => r.leg == null).length;

      setProfile(me);
      setReferrals(refs);
      setStats({
        totalInvited: referralStats.totalInvited,
        activeUsers: activeCount,
        pendingPlacements: mockPlacementRequests.length,
        totalCommission: me.monthly_income_paise,
        leftCount: leftDirectCount,
        rightCount: rightDirectCount,
        unplacedCount: unplacedDirectCount,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invite data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
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
