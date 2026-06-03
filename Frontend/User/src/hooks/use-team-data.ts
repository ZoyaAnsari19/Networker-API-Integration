'use client';

import * as React from 'react';
import {
  mockDelay,
  mockTeamLeft,
  mockTeamRight,
  mockTeamStats,
} from '@/lib/mock-api-data';

export interface TeamMember {
  user_id: string;
  sponsor_id: string;
  full_name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  package_name: string | null;
  leg: 'LEFT' | 'RIGHT';
  is_direct: boolean;
  volume: number;
  depth: number;
  joined_at: string;
}

export interface TeamStatsView {
  total_members: number;
  active_members: number;
  new_this_week: number;
  left_count: number;
  right_count: number;
  left_volume: number;
  right_volume: number;
  total_volume: number;
}

export interface TeamData {
  stats: TeamStatsView;
  left: TeamMember[];
  right: TeamMember[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const emptyStats: TeamStatsView = {
  total_members: 0,
  active_members: 0,
  new_this_week: 0,
  left_count: 0,
  right_count: 0,
  left_volume: 0,
  right_volume: 0,
  total_volume: 0,
};

export function useTeamData(): TeamData {
  const [stats, setStats] = React.useState<TeamStatsView>(emptyStats);
  const [left, setLeft] = React.useState<TeamMember[]>([]);
  const [right, setRight] = React.useState<TeamMember[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await mockDelay();
      setStats(mockTeamStats);
      setLeft(mockTeamLeft);
      setRight(mockTeamRight);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return {
    stats,
    left,
    right,
    loading,
    error,
    refresh: load,
  };
}
