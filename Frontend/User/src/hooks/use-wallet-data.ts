'use client';

import * as React from 'react';
import { ApiError } from '@/lib/api-client';
import type { LedgerEntry } from '@/lib/dashboard-types';
import { devError, devLog } from '@/lib/dev-log';
import { fetchWalletPageData, type WalletSummary } from '@/lib/wallet-api';

export type { WalletSummary } from '@/lib/wallet-api';

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
  if (e.description?.trim()) {
    return e.description.trim();
  }
  const wt = e.wallet_type === 'TEAM' ? 'Team wallet' : 'Direct wallet';
  const src = e.source.replace(/_/g, ' ').toLowerCase();
  return `${wt} · ${src}`;
}

function ledgerToRows(entries: LedgerEntry[]): WalletTransactionRow[] {
  return entries.map((e) => {
    const signedPaise =
      e.entry_type === 'CREDIT'
        ? e.amount
        : e.entry_type === 'DEBIT'
          ? -e.amount
          : 0;
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
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      devLog('Wallet', 'Loading from API…');
      const data = await fetchWalletPageData();
      setBalances(data.balances);
      setPlatformWalletLinked(data.platformWalletLinked);
      setSecureBalancePaise(data.secureBalancePaise);
      setTransactions(ledgerToRows(data.ledgerEntries));
      devLog('Wallet', 'Loaded (API)', {
        direct_paise: data.balances.direct_balance,
        team_paise: data.balances.team_balance,
        tx_rows: data.ledgerEntries.length,
        platform_linked: data.platformWalletLinked,
      });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load wallet';
      devError('Wallet', message, e);
      setError(message);
      setBalances(null);
      setTransactions([]);
      setPlatformWalletLinked(false);
      setSecureBalancePaise(null);
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
