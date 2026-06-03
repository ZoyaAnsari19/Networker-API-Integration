'use client';

import * as React from 'react';
import {
  mockDelay,
  mockDirectLedger,
  mockMeProfile,
  mockTeamLedger,
  mockWalletSummary,
  type MockLedgerEntry,
} from '@/lib/mock-api-data';

export interface WalletSummary {
  direct_balance: number;
  team_balance: number;
  total_balance: number;
}

export interface LedgerEntry {
  id: number;
  user_id: string;
  wallet_type: string;
  amount: number;
  entry_type: string;
  source: string;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  created_at: string;
}

export type WalletTxDisplayType =
  | 'deposit'
  | 'withdrawal'
  | 'transfer'
  | 'commission'
  | 'bonus';

export interface WalletTransactionRow {
  id: string;
  type: WalletTxDisplayType;
  description: string;
  date: string;
  amountRupees: number;
  walletType: string;
}

function sourceToDisplayType(
  source: string,
  entryType: string,
): WalletTxDisplayType {
  if (source === 'WITHDRAWAL') {
    return 'withdrawal';
  }
  if (source === 'P2P_TRANSFER') {
    return 'transfer';
  }
  if (source === 'LEVEL_BONUS') {
    return 'bonus';
  }
  if (
    source === 'DIRECT_COMMISSION' ||
    source === 'BINARY_MATCH' ||
    source === 'FRANCHISE_COMMISSION'
  ) {
    return 'commission';
  }
  if (entryType === 'DEBIT') {
    return 'withdrawal';
  }
  if (entryType === 'CREDIT') {
    return 'deposit';
  }
  return 'commission';
}

function rowDescription(e: LedgerEntry): string {
  if (e.description && e.description.trim()) {
    return e.description.trim();
  }
  const wt = e.wallet_type === 'TEAM' ? 'Team wallet' : 'Direct wallet';
  const src = e.source.replace(/_/g, ' ').toLowerCase();
  return `${wt} · ${src}`;
}

function ledgerToRows(entries: MockLedgerEntry[]): WalletTransactionRow[] {
  return entries.map((e) => {
    const signedPaise =
      e.entry_type === 'CREDIT' ? e.amount : e.entry_type === 'DEBIT' ? -e.amount : 0;
    return {
      id: `${e.wallet_type}-${e.id}`,
      type: sourceToDisplayType(e.source, e.entry_type),
      description: rowDescription(e),
      date: e.created_at,
      amountRupees: signedPaise / 100,
      walletType: e.wallet_type,
    };
  });
}

export interface WalletPageData {
  balances: WalletSummary | null;
  secureBalancePaise: number | null;
  platformWalletLinked: boolean;
  transactions: WalletTransactionRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useWalletData(): WalletPageData {
  const [balances, setBalances] = React.useState<WalletSummary | null>(null);
  const [secureBalancePaise, setSecureBalancePaise] = React.useState<
    number | null
  >(null);
  const [platformWalletLinked, setPlatformWalletLinked] =
    React.useState(false);
  const [transactions, setTransactions] = React.useState<
    WalletTransactionRow[]
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await mockDelay();
      setBalances(mockWalletSummary);
      setPlatformWalletLinked(Boolean(mockMeProfile.secure_wallet_external_id));
      setSecureBalancePaise(mockMeProfile.secure_wallet_balance_paise ?? null);

      const merged = [...mockDirectLedger, ...mockTeamLedger].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setTransactions(ledgerToRows(merged.slice(0, 100)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wallet');
      setBalances(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return {
    balances,
    secureBalancePaise,
    platformWalletLinked,
    transactions,
    loading,
    error,
    refresh: load,
  };
}
