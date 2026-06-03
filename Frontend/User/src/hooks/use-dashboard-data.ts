'use client';

import * as React from 'react';
import {
  mockDelay,
  mockDirectLedger,
  mockMeProfile,
  mockTeamLedger,
  mockTreeView,
  mockWalletSummary,
} from '@/lib/mock-api-data';

export interface DashboardProfile {
  user_id: string;
  sponsor_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  role: string;
  current_package_id: string | null;
  package_activated_at: string | null;
  monthly_income_paise: number;
  monthly_shopping_paise: number;
  income_period_ym: number;
  today_binary_earned: number;
  daily_binary_cap: number;
  placement_status: string;
  package_name: string | null;
  package_amount: number | null;
  direct_wallet_balance: number;
  team_wallet_balance: number;
  direct_referral_count: number;
  sponsor_name: string | null;
}

export interface WalletSummary {
  direct_balance: number;
  team_balance: number;
  total_balance: number;
}

export interface LedgerEntry {
  id: number;
  user_id: string;
  wallet_type: 'DIRECT' | 'TEAM';
  amount: number;
  entry_type: 'CREDIT' | 'DEBIT';
  source: string;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface TreeView {
  user_id: string;
  full_name: string;
  leg: string | null;
  left_bv: number;
  right_bv: number;
  status: string;
  left?: TreeView;
  right?: TreeView;
}

export interface BinarySide {
  count: number;
  activeCount: number;
  volume: number;
}

export interface BinarySides {
  left: BinarySide;
  right: BinarySide;
}

export interface DailyEarnings {
  date: string;
  dateLabel: string;
  direct: number;
  binary: number;
}

export interface EarningsTotals {
  today: number;
  weekly: number;
  monthly: number;
  total: number;
}

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
      const at = new Date(e.created_at);
      totals.total += e.amount;
      if (at >= monthStart) totals.monthly += e.amount;
      if (at >= weekStart) totals.weekly += e.amount;
      if (at >= today) totals.today += e.amount;

      const key = startOfDay(at).toISOString().split('T')[0];
      const b = buckets.get(key);
      if (b) b[bucketField] += e.amount;
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
    try {
      await mockDelay();
      setProfile(mockMeProfile);
      setWallets(mockWalletSummary);
      setBinary(countTreeSides(mockTreeView));

      const { series, totals: t } = buildSeries(
        mockDirectLedger,
        mockTeamLedger,
        rangeDays,
      );
      setEarningsSeries(series);
      setTotals(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
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
