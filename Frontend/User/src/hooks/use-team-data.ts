'use client';

import * as React from 'react';
import { ApiError } from '@/lib/api-client';
import { devError, devLog } from '@/lib/dev-log';
import { fetchTeamPageData } from '@/lib/team-api';
import type { TeamMember, TeamStatsView } from '@/lib/team-types';

export type { TeamMember, TeamStatsView } from '@/lib/team-types';

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
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      devLog('Team', 'Loading from API…');
      const data = await fetchTeamPageData();
      setStats(data.stats);
      setLeft(data.left);
      setRight(data.right);
      devLog('Team', 'Loaded (API)', {
        total_members: data.stats.total_members,
        left_rows: data.left.length,
        right_rows: data.right.length,
      });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load team data';
      devError('Team', message, e);
      setError(message);
      setStats(emptyStats);
      setLeft([]);
      setRight([]);
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
