import { apiJson, unwrapData, type ApiEnvelope } from '@/lib/api-client';

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

export interface PayoutListMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface PaginatedPayoutResponse {
  success: boolean;
  data?: Array<Record<string, unknown>>;
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  error?: string;
}

function normalizeSchedule(raw: Record<string, unknown>): WithdrawalSchedule {
  return {
    server_now_ist: String(raw.server_now_ist ?? new Date().toISOString()),
    ist_start_hour: Number(raw.ist_start_hour ?? 0),
    ist_end_hour: Number(raw.ist_end_hour ?? 23),
    within_time_window: Boolean(raw.within_time_window),
    min_withdrawal_paise: Number(raw.min_withdrawal_paise ?? 0),
    service_charge_percent: Number(raw.service_charge_percent ?? 0),
    tds_percent: Number(raw.tds_percent ?? 0),
    allowed_dates_direct: Array.isArray(raw.allowed_dates_direct)
      ? raw.allowed_dates_direct.map((d) => Number(d))
      : [],
    allowed_dates_team: Array.isArray(raw.allowed_dates_team)
      ? raw.allowed_dates_team.map((d) => Number(d))
      : [],
    today_allowed_for_direct: Boolean(raw.today_allowed_for_direct),
    today_allowed_for_team: Boolean(raw.today_allowed_for_team),
    max_percent_of_monthly_income: Number(
      raw.max_percent_of_monthly_income ?? 0,
    ),
  };
}

function normalizePayout(raw: Record<string, unknown>): PayoutRecord {
  const processed = raw.processed_at;
  return {
    payout_id: String(raw.payout_id ?? ''),
    user_id: String(raw.user_id ?? ''),
    wallet_type: String(raw.wallet_type ?? ''),
    requested_amount: Number(raw.requested_amount ?? 0),
    service_charge_paise: Number(raw.service_charge_paise ?? 0),
    tds_paise: Number(raw.tds_paise ?? 0),
    net_payout_paise: Number(raw.net_payout_paise ?? 0),
    payment_method: String(raw.payment_method ?? 'SECURE_WALLET'),
    approved_amount:
      raw.approved_amount == null ? null : Number(raw.approved_amount),
    status: String(raw.status ?? 'PENDING'),
    admin_id: (raw.admin_id as string | null) ?? null,
    admin_note: (raw.admin_note as string | null) ?? null,
    sc_tx_reference: (raw.sc_tx_reference as string | null) ?? null,
    sc_user_email: (raw.sc_user_email as string | null) ?? null,
    requested_at: String(raw.requested_at ?? new Date().toISOString()),
    processed_at:
      processed == null || processed === ''
        ? null
        : String(processed),
  };
}

export async function fetchWithdrawalSchedule(): Promise<WithdrawalSchedule> {
  const envelope = await apiJson<ApiEnvelope<Record<string, unknown>>>(
    '/api/v1/payouts/schedule',
  );
  return normalizeSchedule(unwrapData(envelope));
}

export async function fetchPayoutsPage(
  page = 1,
  limit = 20,
): Promise<{ payouts: PayoutRecord[]; meta: PayoutListMeta }> {
  const res = await apiJson<PaginatedPayoutResponse>(
    `/api/v1/payouts?page=${page}&limit=${limit}`,
  );
  const payouts = (res.data ?? []).map((row) =>
    normalizePayout(row as Record<string, unknown>),
  );
  return {
    payouts,
    meta: {
      page: res.meta?.page ?? page,
      limit: res.meta?.limit ?? limit,
      total: Number(res.meta?.total ?? payouts.length),
      total_pages: Math.max(1, Number(res.meta?.total_pages ?? 1)),
    },
  };
}

export async function requestPayoutApi(input: {
  walletType: PayoutWalletType;
  amountPaise: number;
  transactionPassword: string;
  paymentMethod?: PayoutPaymentMethod;
}): Promise<PayoutRecord> {
  const envelope = await apiJson<ApiEnvelope<Record<string, unknown>>>(
    '/api/v1/payouts/request',
    {
      method: 'POST',
      body: {
        wallet_type: input.walletType,
        amount: input.amountPaise,
        transaction_password: input.transactionPassword,
        payment_method: input.paymentMethod ?? 'SECURE_WALLET',
      },
    },
  );
  return normalizePayout(unwrapData(envelope));
}
