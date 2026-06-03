'use client';

import * as React from 'react';
import {
  mockDelay,
  mockP2PQuote,
  mockP2PTransfers,
  mockWalletSummary,
} from '@/lib/mock-api-data';

export interface WalletSummary {
  direct_balance: number;
  team_balance: number;
  total_balance: number;
}

export interface P2PQuote {
  enabled: boolean;
  min_amount_paise: number;
  service_charge_percent: number;
  amount?: number;
  service_charge?: number;
  net_amount?: number;
}

export interface P2PLookup {
  sponsor_id: string;
  full_name: string;
  status: string;
  eligible: boolean;
  reason?: string;
}

export interface P2PTransfer {
  transfer_id: string;
  sender_user_id: string;
  receiver_user_id: string;
  sender_sponsor_id: string;
  receiver_sponsor_id: string;
  wallet_type: string;
  amount: number;
  service_charge: number;
  net_amount: number;
  note?: string | null;
  direction?: 'IN' | 'OUT';
  counterparty_name?: string;
  created_at: string;
}

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

function quoteWithAmount(base: P2PQuote, amountPaise: number): P2PQuote {
  const amount = Math.max(0, Math.floor(amountPaise));
  const serviceCharge = Math.floor(
    (amount * base.service_charge_percent) / 100,
  );
  return {
    ...base,
    amount,
    service_charge: serviceCharge,
    net_amount: amount - serviceCharge,
  };
}

export function useP2PData(): P2PData {
  const [wallets, setWallets] = React.useState<WalletSummary | null>(null);
  const [quote, setQuote] = React.useState<P2PQuote | null>(null);
  const [transfers, setTransfers] = React.useState<P2PTransfer[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await mockDelay();
      setWallets(mockWalletSummary);
      setQuote(mockP2PQuote);
      setTransfers(mockP2PTransfers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load P2P data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const refreshQuote = React.useCallback(
    async (amountPaise: number): Promise<P2PQuote | null> => {
      const q = quoteWithAmount(mockP2PQuote, amountPaise);
      setQuote(q);
      return q;
    },
    [],
  );

  const lookupReceiver = React.useCallback(
    async (sponsorId: string): Promise<P2PLookup> => {
      await mockDelay(200);
      const id = sponsorId.trim().toUpperCase();
      if (!id) {
        return {
          sponsor_id: id,
          full_name: '',
          status: 'INACTIVE',
          eligible: false,
          reason: 'Enter a valid sponsor ID',
        };
      }
      return {
        sponsor_id: id,
        full_name: 'Demo Member',
        status: 'ACTIVE',
        eligible: true,
      };
    },
    [],
  );

  const transfer = React.useCallback(
    async (input: {
      receiverSponsorId: string;
      amountPaise: number;
      transactionPassword: string;
      note?: string;
    }): Promise<P2PTransfer> => {
      await mockDelay(500);
      const q = quoteWithAmount(mockP2PQuote, input.amountPaise);
      const result: P2PTransfer = {
        transfer_id: `p2p_mock_${Date.now()}`,
        sender_user_id: 'usr_001',
        receiver_user_id: 'usr_demo',
        sender_sponsor_id: 'ALEX2024',
        receiver_sponsor_id: input.receiverSponsorId,
        wallet_type: 'TEAM',
        amount: q.amount ?? input.amountPaise,
        service_charge: q.service_charge ?? 0,
        net_amount: q.net_amount ?? input.amountPaise,
        note: input.note ?? '',
        direction: 'OUT',
        counterparty_name: 'Demo Member',
        created_at: new Date().toISOString(),
      };
      setTransfers((prev) => [result, ...prev].slice(0, 10));
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
