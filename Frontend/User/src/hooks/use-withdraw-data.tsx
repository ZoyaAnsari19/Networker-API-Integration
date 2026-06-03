'use client';

import * as React from 'react';
import {
  mockDelay,
  mockPayouts,
  mockWithdrawalSchedule,
} from '@/lib/mock-api-data';

export type PayoutWalletType = 'DIRECT' | 'TEAM';
export type PayoutPaymentMethod = 'SECURE_WALLET';

export interface WithdrawalSchedule {
  server_now_ist: string;
  ist_start_hour: number;
  ist_end_hour: number;
  within_time_window: boolean;
  min_withdrawal_paise: number;
  service_charge_percent: number;
  tds_percent: number;
  allowed_dates_direct: number[];
  allowed_dates_team: number[];
  today_allowed_for_direct: boolean;
  today_allowed_for_team: boolean;
  max_percent_of_monthly_income: number;
}

export interface PayoutRecord {
  payout_id: string;
  user_id: string;
  wallet_type: string;
  requested_amount: number;
  service_charge_paise: number;
  tds_paise: number;
  net_payout_paise: number;
  payment_method: string;
  approved_amount?: number | null;
  status: string;
  admin_id?: string | null;
  admin_note?: string | null;
  sc_tx_reference?: string | null;
  sc_user_email?: string | null;
  requested_at: string;
  processed_at?: string | null;
}

export function useWithdrawData() {
  const [schedule, setSchedule] = React.useState<WithdrawalSchedule | null>(
    null,
  );
  const [payouts, setPayouts] = React.useState<PayoutRecord[]>([]);
  const [meta, setMeta] = React.useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await mockDelay();
      setSchedule(mockWithdrawalSchedule);
      setPayouts(mockPayouts);
      setMeta({
        page: 1,
        limit: 20,
        total: mockPayouts.length,
        total_pages: 1,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const fetchPayouts = React.useCallback(async (page = 1) => {
    await mockDelay(200);
    setPayouts(mockPayouts);
    setMeta({
      page,
      limit: 20,
      total: mockPayouts.length,
      total_pages: 1,
    });
  }, []);

  const requestPayout = React.useCallback(
    async (input: {
      walletType: PayoutWalletType;
      amountPaise: number;
      transactionPassword: string;
      paymentMethod: PayoutPaymentMethod;
    }) => {
      await mockDelay(500);
      const serviceCharge = Math.floor(input.amountPaise * 0.02);
      const tds = Math.floor(input.amountPaise * 0.05);
      const record: PayoutRecord = {
        payout_id: `pay_mock_${Date.now()}`,
        user_id: 'usr_001',
        wallet_type: input.walletType,
        requested_amount: input.amountPaise,
        service_charge_paise: serviceCharge,
        tds_paise: tds,
        net_payout_paise: input.amountPaise - serviceCharge - tds,
        payment_method: input.paymentMethod,
        status: 'PENDING',
        requested_at: new Date().toISOString(),
        processed_at: null,
      };
      setPayouts((prev) => [record, ...prev]);
      return record;
    },
    [],
  );

  return {
    schedule,
    payouts,
    meta,
    loading,
    error,
    refresh,
    fetchPayouts,
    requestPayout,
  };
}
