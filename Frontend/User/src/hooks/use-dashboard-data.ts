'use client';

import * as React from 'react';
import {
  fetchAllLedgerEntries,
  fetchDashboardProfile,
  fetchTreeView,
} from '@/lib/dashboard-api';
import type {
  BinarySide,
  BinarySides,
  DailyEarnings,
  DashboardProfile,
  EarningsTotals,
  LedgerEntry,
  TreeView,
  WalletSummary,
} from '@/lib/dashboard-types';
import { devError, devLog } from '@/lib/dev-log';

export type {
  DashboardProfile,
  WalletSummary,
  LedgerEntry,
  TreeView,
  BinarySide,
  BinarySides,
  DailyEarnings,
  EarningsTotals,
} from '@/lib/dashboard-types';

export interface DashboardData {
  profile: DashboardProfile | null;
  wallets: WalletSummary | null;
  binary: BinarySides | null;
  earningsSeries: DailyEarnings[];
  totals: EarningsTotals | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function countTreeSides(root: TreeView | null): BinarySides {
  const empty: BinarySides = {
    left: { count: 0, activeCount: 0, volume: 0 },
    right: { count: 0, activeCount: 0, volume: 0 },
  };
  if (!root) return empty;

  const walk = (
    node: TreeView | undefined,
    acc: BinarySide,
  ): BinarySide => {
    if (!node) return acc;
    acc.count += 1;
    if (node.status === 'ACTIVE') acc.activeCount += 1;
    walk(node.left, acc);
    walk(node.right, acc);
    return acc;
  };

  return {
    left: {
      ...walk(root.left, { count: 0, activeCount: 0, volume: 0 }),
      volume: root.left_bv,
    },
    right: {
      ...walk(root.right, { count: 0, activeCount: 0, volume: 0 }),
      volume: root.right_bv,
    },
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildSeries(
  direct: LedgerEntry[],
  team: LedgerEntry[],
  days: number,
): { series: DailyEarnings[]; totals: EarningsTotals } {
  const today = startOfDay(new Date());
  const buckets = new Map<string, DailyEarnings>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    buckets.set(key, {
      date: key,
      dateLabel: d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      }),
      direct: 0,
      binary: 0,
    });
  }

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(today);
  monthStart.setDate(monthStart.getDate() - 29);
  const totals: EarningsTotals = { today: 0, weekly: 0, monthly: 0, total: 0 };

  const consume = (entries: LedgerEntry[], bucketField: 'direct' | 'binary') => {
    for (const e of entries) {
      if (e.entry_type !== 'CREDIT') continue;
      const rupees = e.amount / 100;
      const at = new Date(e.created_at);
      totals.total += rupees;
      if (at >= monthStart) totals.monthly += rupees;
      if (at >= weekStart) totals.weekly += rupees;
      if (at >= today) totals.today += rupees;

      const key = startOfDay(at).toISOString().split('T')[0];
      const b = buckets.get(key);
      if (b) b[bucketField] += rupees;
    }
  };

  consume(direct, 'direct');
  consume(team, 'binary');

  return { series: Array.from(buckets.values()), totals };
}

export function useDashboardData(rangeDays: number = 30): DashboardData {
  const [profile, setProfile] = React.useState<DashboardProfile | null>(null);
  const [wallets, setWallets] = React.useState<WalletSummary | null>(null);
  const [binary, setBinary] = React.useState<BinarySides | null>(null);
  const [earningsSeries, setEarningsSeries] = React.useState<DailyEarnings[]>(
    [],
  );
  const [totals, setTotals] = React.useState<EarningsTotals | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    devLog('Dashboard', 'Loading from API…', { rangeDays });
    try {
      const [profileData, directLedger, teamLedger, tree] = await Promise.all([
        fetchDashboardProfile(),
        fetchAllLedgerEntries('DIRECT'),
        fetchAllLedgerEntries('TEAM'),
        fetchTreeView(15),
      ]);

      const walletSummary: WalletSummary = {
        direct_balance: profileData.direct_wallet_balance,
        team_balance: profileData.team_wallet_balance,
        total_balance:
          profileData.direct_wallet_balance + profileData.team_wallet_balance,
      };

      const { series, totals: t } = buildSeries(
        directLedger,
        teamLedger,
        rangeDays,
      );

      setProfile(profileData);
      setWallets(walletSummary);
      setBinary(countTreeSides(tree));
      setEarningsSeries(series);
      setTotals(t);

      devLog('Dashboard', 'Loaded (API, paise)', {
        full_name: profileData.full_name,
        sponsor_id: profileData.sponsor_id,
        direct_referrals: profileData.direct_referral_count,
        totals: t,
        direct_ledger_rows: directLedger.length,
        team_ledger_rows: teamLedger.length,
        monthly_income_paise: profileData.monthly_income_paise,
        today_binary_earned: profileData.today_binary_earned,
        daily_binary_cap: profileData.daily_binary_cap,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load dashboard';
      devError('Dashboard', msg, e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  React.useEffect(() => {
    load();
  }, [load]);

  return {
    profile,
    wallets,
    binary,
    earningsSeries,
    totals,
    loading,
    error,
    refresh: load,
  };
}
