'use client';

import * as React from 'react';
import {
  mockDelay,
  mockDirectLedger,
  mockTeamLedger,
  type MockLedgerEntry,
} from '@/lib/mock-api-data';

export type IncomeRangeKey = '7d' | '30d' | '90d' | 'all';

export const INCOME_RANGE_LABELS: Record<IncomeRangeKey, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
};

export type IncomeTableRow = {
  id: string;
  from: string;
  amountRupees: number;
  date: string;
  status: 'completed' | 'pending';
  level?: number;
};

export type LedgerEntry = MockLedgerEntry;

function humanizeSource(source: string): string {
  return source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPayerName(e: LedgerEntry): string | null {
  const anyE = e as LedgerEntry & Record<string, unknown>;
  const candidates = [
    anyE.payer_name,
    anyE.from_name,
    anyE.user_display_name,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  if (e.description && e.description.trim()) {
    const desc = e.description.trim();
    const m1 = desc.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+){0,3})\s*(?:—|-|:)\s*/);
    if (m1?.[1]) return m1[1].trim();
    const m2 = desc.match(/(?:from|by)\s+([A-Z][a-z]+(?: [A-Z][a-z]+){0,3})/i);
    if (m2?.[1]) return m2[1].trim();
  }
  return null;
}

function rowLabel(e: LedgerEntry): string {
  const payer = getPayerName(e);
  if (payer) return payer;
  if (e.description?.trim()) return e.description.trim();
  return humanizeSource(e.source);
}

function parseLevel(description: string | null | undefined): number | undefined {
  if (!description) return undefined;
  const m = description.match(/[Ll]evel\s*(\d+)/);
  if (m) return parseInt(m[1], 10);
  return undefined;
}

function isCreditIncome(e: LedgerEntry): boolean {
  return e.entry_type === 'CREDIT' && e.amount > 0;
}

function inRange(isoDate: string, range: IncomeRangeKey): boolean {
  if (range === 'all') return true;
  const t = new Date(isoDate).getTime();
  const now = Date.now();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return t >= now - days * 24 * 60 * 60 * 1000;
}

function toIncomeRow(e: LedgerEntry): IncomeTableRow {
  return {
    id: `${e.wallet_type}-${e.id}`,
    from: rowLabel(e),
    amountRupees: e.amount / 100,
    date: e.created_at,
    status: 'completed',
    level: parseLevel(e.description ?? undefined),
  };
}

function filterByRange(rows: IncomeTableRow[], range: IncomeRangeKey): IncomeTableRow[] {
  return rows.filter((r) => inRange(r.date, range));
}

function sumRowAmounts(rows: IncomeTableRow[]): number {
  return rows.reduce((s, r) => s + r.amountRupees, 0);
}

export interface UseIncomeDataResult {
  range: IncomeRangeKey;
  setRange: (r: IncomeRangeKey) => void;
  totalEarningsInRangeRupees: number;
  directCommissionInRangeRupees: number;
  binaryCommissionInRangeRupees: number;
  levelIncomeInRangeRupees: number;
  directRows: IncomeTableRow[];
  binaryRows: IncomeTableRow[];
  levelRows: IncomeTableRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useIncomeData(): UseIncomeDataResult {
  const [range, setRange] = React.useState<IncomeRangeKey>('30d');
  const [directLedger, setDirectLedger] = React.useState<LedgerEntry[]>([]);
  const [teamLedger, setTeamLedger] = React.useState<LedgerEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await mockDelay();
      setDirectLedger(mockDirectLedger);
      setTeamLedger(mockTeamLedger);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load income');
      setDirectLedger([]);
      setTeamLedger([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const directSource = React.useMemo(() => {
    return directLedger.filter(
      (e) =>
        isCreditIncome(e) &&
        (e.source === 'DIRECT_COMMISSION' || e.source === 'FRANCHISE_COMMISSION'),
    );
  }, [directLedger]);

  const binarySource = React.useMemo(() => {
    return teamLedger.filter((e) => isCreditIncome(e) && e.source === 'BINARY_MATCH');
  }, [teamLedger]);

  const levelSource = React.useMemo(() => {
    return teamLedger.filter((e) => isCreditIncome(e) && e.source === 'LEVEL_BONUS');
  }, [teamLedger]);

  const directRowsAll = React.useMemo(
    () =>
      [...directSource]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(toIncomeRow),
    [directSource],
  );
  const binaryRowsAll = React.useMemo(
    () =>
      [...binarySource]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(toIncomeRow),
    [binarySource],
  );
  const levelRowsAll = React.useMemo(
    () =>
      [...levelSource]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(toIncomeRow),
    [levelSource],
  );

  const directRows = React.useMemo(() => filterByRange(directRowsAll, range), [directRowsAll, range]);
  const binaryRows = React.useMemo(() => filterByRange(binaryRowsAll, range), [binaryRowsAll, range]);
  const levelRows = React.useMemo(() => filterByRange(levelRowsAll, range), [levelRowsAll, range]);

  const directCommissionInRangeRupees = React.useMemo(() => sumRowAmounts(directRows), [directRows]);
  const binaryCommissionInRangeRupees = React.useMemo(() => sumRowAmounts(binaryRows), [binaryRows]);
  const levelIncomeInRangeRupees = React.useMemo(() => sumRowAmounts(levelRows), [levelRows]);
  const totalEarningsInRangeRupees = React.useMemo(
    () =>
      directCommissionInRangeRupees + binaryCommissionInRangeRupees + levelIncomeInRangeRupees,
    [directCommissionInRangeRupees, binaryCommissionInRangeRupees, levelIncomeInRangeRupees],
  );

  return {
    range,
    setRange,
    totalEarningsInRangeRupees,
    directCommissionInRangeRupees,
    binaryCommissionInRangeRupees,
    levelIncomeInRangeRupees,
    directRows,
    binaryRows,
    levelRows,
    loading,
    error,
    refresh: load,
  };
}
