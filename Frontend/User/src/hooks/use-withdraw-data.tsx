'use client';

import * as React from 'react';
import { ApiError } from '@/lib/api-client';
import { devError, devLog } from '@/lib/dev-log';
import {
  fetchPayoutsPage,
  fetchWithdrawalSchedule,
  requestPayoutApi,
  type PayoutListMeta,
  type PayoutPaymentMethod,
  type PayoutRecord,
  type PayoutWalletType,
  type WithdrawalSchedule,
} from '@/lib/payout-api';

export type {
  PayoutWalletType,
  PayoutPaymentMethod,
  WithdrawalSchedule,
  PayoutRecord,
} from '@/lib/payout-api';

const PAYOUT_PAGE_LIMIT = 20;

export function useWithdrawData() {
  const [schedule, setSchedule] = React.useState<WithdrawalSchedule | null>(
    null,
  );
  const [payouts, setPayouts] = React.useState<PayoutRecord[]>([]);
  const [meta, setMeta] = React.useState<PayoutListMeta>({
    page: 1,
    limit: PAYOUT_PAGE_LIMIT,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPayouts = React.useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPayoutsPage(page, PAYOUT_PAGE_LIMIT);
      setPayouts(result.payouts);
      setMeta(result.meta);
      devLog('Withdraw', 'Payouts page loaded', {
        page: result.meta.page,
        rows: result.payouts.length,
        total: result.meta.total,
      });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load payout history';
      devError('Withdraw', message, e);
      setError(message);
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      devLog('Withdraw', 'Loading schedule + payouts from API…');
      const [scheduleData, payoutResult] = await Promise.all([
        fetchWithdrawalSchedule(),
        fetchPayoutsPage(1, PAYOUT_PAGE_LIMIT),
      ]);
      setSchedule(scheduleData);
      setPayouts(payoutResult.payouts);
      setMeta(payoutResult.meta);
      devLog('Withdraw', 'Loaded (API)', {
        within_window: scheduleData.within_time_window,
        payout_rows: payoutResult.payouts.length,
      });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load withdrawals';
      devError('Withdraw', message, e);
      setError(message);
      setSchedule(null);
      setPayouts([]);
      setMeta({
        page: 1,
        limit: PAYOUT_PAGE_LIMIT,
        total: 0,
        total_pages: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestPayout = React.useCallback(
    async (input: {
      walletType: PayoutWalletType;
      amountPaise: number;
      transactionPassword: string;
      paymentMethod: PayoutPaymentMethod;
    }) =>
      requestPayoutApi({
        walletType: input.walletType,
        amountPaise: input.amountPaise,
        transactionPassword: input.transactionPassword,
        paymentMethod: input.paymentMethod,
      }),
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
