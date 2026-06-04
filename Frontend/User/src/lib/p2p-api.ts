import { apiJson, unwrapData, type ApiEnvelope } from '@/lib/api-client';

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

interface PaginatedP2PResponse {
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

function normalizeQuote(raw: Record<string, unknown>): P2PQuote {
  const q: P2PQuote = {
    enabled: Boolean(raw.enabled),
    min_amount_paise: Number(raw.min_amount_paise ?? 0),
    service_charge_percent: Number(raw.service_charge_percent ?? 0),
  };
  if (raw.amount != null && raw.amount !== '') {
    q.amount = Number(raw.amount);
  }
  if (raw.service_charge != null && raw.service_charge !== '') {
    q.service_charge = Number(raw.service_charge);
  }
  if (raw.net_amount != null && raw.net_amount !== '') {
    q.net_amount = Number(raw.net_amount);
  }
  return q;
}

function normalizeLookup(raw: Record<string, unknown>): P2PLookup {
  const reason = raw.reason;
  return {
    sponsor_id: String(raw.sponsor_id ?? ''),
    full_name: String(raw.full_name ?? ''),
    status: String(raw.status ?? ''),
    eligible: Boolean(raw.eligible),
    reason:
      reason == null || reason === '' ? undefined : String(reason),
  };
}

function normalizeTransfer(raw: Record<string, unknown>): P2PTransfer {
  const note = raw.note;
  const dir = raw.direction;
  return {
    transfer_id: String(raw.transfer_id ?? ''),
    sender_user_id: String(raw.sender_user_id ?? ''),
    receiver_user_id: String(raw.receiver_user_id ?? ''),
    sender_sponsor_id: String(raw.sender_sponsor_id ?? ''),
    receiver_sponsor_id: String(raw.receiver_sponsor_id ?? ''),
    wallet_type: String(raw.wallet_type ?? 'DIRECT'),
    amount: Number(raw.amount ?? 0),
    service_charge: Number(raw.service_charge ?? 0),
    net_amount: Number(raw.net_amount ?? 0),
    note: note == null || note === '' ? null : String(note),
    direction:
      dir === 'IN' || dir === 'OUT' ? (dir as 'IN' | 'OUT') : undefined,
    counterparty_name:
      raw.counterparty_name == null || raw.counterparty_name === ''
        ? undefined
        : String(raw.counterparty_name),
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

export async function fetchP2PQuote(amountPaise = 0): Promise<P2PQuote> {
  const params = new URLSearchParams();
  if (amountPaise > 0) {
    params.set('amount', String(Math.floor(amountPaise)));
  }
  const qs = params.toString();
  const envelope = await apiJson<ApiEnvelope<Record<string, unknown>>>(
    `/api/v1/p2p/quote${qs ? `?${qs}` : ''}`,
  );
  return normalizeQuote(unwrapData(envelope));
}

export async function lookupP2PReceiver(
  sponsorId: string,
): Promise<P2PLookup> {
  const id = sponsorId.trim();
  const envelope = await apiJson<ApiEnvelope<Record<string, unknown>>>(
    `/api/v1/p2p/lookup?sponsor_id=${encodeURIComponent(id)}`,
  );
  return normalizeLookup(unwrapData(envelope));
}

export async function fetchP2PTransfersPage(
  page = 1,
  limit = 20,
): Promise<P2PTransfer[]> {
  const res = await apiJson<PaginatedP2PResponse>(
    `/api/v1/p2p/transfers?page=${page}&limit=${limit}`,
  );
  return (res.data ?? []).map((row) =>
    normalizeTransfer(row as Record<string, unknown>),
  );
}

export async function submitP2PTransfer(input: {
  receiverSponsorId: string;
  amountPaise: number;
  transactionPassword: string;
  note?: string;
}): Promise<P2PTransfer> {
  const envelope = await apiJson<ApiEnvelope<Record<string, unknown>>>(
    '/api/v1/p2p/transfer',
    {
      method: 'POST',
      body: {
        receiver_sponsor_id: input.receiverSponsorId.trim(),
        amount: Math.floor(input.amountPaise),
        transaction_password: input.transactionPassword,
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      },
    },
  );
  return normalizeTransfer(unwrapData(envelope));
}
