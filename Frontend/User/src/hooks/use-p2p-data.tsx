'use client';

import * as React from 'react';
import { ApiError } from '@/lib/api-client';
import { devError, devLog } from '@/lib/dev-log';
import {
  fetchP2PQuote,
  fetchP2PTransfersPage,
  lookupP2PReceiver,
  submitP2PTransfer,
  type P2PLookup,
  type P2PQuote,
  type P2PTransfer,
} from '@/lib/p2p-api';
import { fetchWalletBalances, type WalletSummary } from '@/lib/wallet-api';

export type { WalletSummary } from '@/lib/wallet-api';
export type { P2PQuote, P2PLookup, P2PTransfer } from '@/lib/p2p-api';

const TRANSFER_LIST_LIMIT = 20;

export interface P2PData {
  wallets: WalletSummary | null;
  quote: P2PQuote | null;
  transfers: P2PTransfer[];
  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  refreshQuote: (amountPaise: number) => Promise<P2PQuote | null>;
  lookupReceiver: (sponsorId: string) => Promise<P2PLookup>;
  transfer: (input: {
    receiverSponsorId: string;
    amountPaise: number;
    transactionPassword: string;
    note?: string;
  }) => Promise<P2PTransfer>;
}

export function useP2PData(): P2PData {
  const [wallets, setWallets] = React.useState<WalletSummary | null>(null);
  const [quote, setQuote] = React.useState<P2PQuote | null>(null);
  const [transfers, setTransfers] = React.useState<P2PTransfer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      devLog('P2P', 'Loading from API…');
      const [balances, quoteData, transferRows] = await Promise.all([
        fetchWalletBalances(),
        fetchP2PQuote(0),
        fetchP2PTransfersPage(1, TRANSFER_LIST_LIMIT),
      ]);
      setWallets(balances);
      setQuote(quoteData);
      setTransfers(transferRows);
      devLog('P2P', 'Loaded (API)', {
        direct_paise: balances.direct_balance,
        transfers: transferRows.length,
        enabled: quoteData.enabled,
      });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load P2P data';
      devError('P2P', message, e);
      setError(message);
      setWallets(null);
      setQuote(null);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const refreshQuote = React.useCallback(
    async (amountPaise: number): Promise<P2PQuote | null> => {
      try {
        const q = await fetchP2PQuote(amountPaise);
        setQuote(q);
        return q;
      } catch (e) {
        devError(
          'P2P',
          e instanceof Error ? e.message : 'Quote failed',
          e,
        );
        return null;
      }
    },
    [],
  );

  const lookupReceiver = React.useCallback(
    async (sponsorId: string): Promise<P2PLookup> => {
      const id = sponsorId.trim();
      if (!id) {
        return {
          sponsor_id: '',
          full_name: '',
          status: 'INACTIVE',
          eligible: false,
          reason: 'Enter a valid sponsor ID',
        };
      }
      return lookupP2PReceiver(id);
    },
    [],
  );

  const transfer = React.useCallback(
    async (input: {
      receiverSponsorId: string;
      amountPaise: number;
      transactionPassword: string;
      note?: string;
    }) => {
      const result = await submitP2PTransfer(input);
      const [balances, transferRows] = await Promise.all([
        fetchWalletBalances(),
        fetchP2PTransfersPage(1, TRANSFER_LIST_LIMIT),
      ]);
      setWallets(balances);
      setTransfers(transferRows);
      return result;
    },
    [],
  );

  return {
    wallets,
    quote,
    transfers,
    loading,
    error,
    refresh: load,
    refreshQuote,
    lookupReceiver,
    transfer,
  };
}
