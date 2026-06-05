import { apiJson, unwrapData, type ApiEnvelope } from '@/lib/api-client';
import type { LedgerEntry } from '@/lib/dashboard-types';
import { fetchMyProfile } from '@/lib/profile-api';

export interface WalletSummary {
  direct_balance: number;
  team_balance: number;
  total_balance: number;
}

interface PaginatedLedgerResponse {
  success: boolean;
  data?: Array<Record<string, unknown>>;
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

function normalizeLedgerEntry(raw: Record<string, unknown>): LedgerEntry {
  return {
    id: Number(raw.id ?? 0),
    user_id: String(raw.user_id ?? ''),
    wallet_type: (raw.wallet_type as 'DIRECT' | 'TEAM') ?? 'DIRECT',
    amount: Number(raw.amount ?? 0),
    entry_type: (raw.entry_type as 'CREDIT' | 'DEBIT') ?? 'CREDIT',
    source: String(raw.source ?? ''),
    reference_id: (raw.reference_id as string | null) ?? null,
    reference_type: (raw.reference_type as string | null) ?? null,
    description: (raw.description as string | null) ?? null,
    payer_name: (raw.payer_name as string | null) ?? null,
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

function normalizeWalletSummary(raw: Record<string, unknown>): WalletSummary {
  const direct = Number(raw.direct_balance ?? 0);
  const team = Number(raw.team_balance ?? 0);
  return {
    direct_balance: direct,
    team_balance: team,
    total_balance: Number(raw.total_balance ?? direct + team),
  };
}

export async function fetchWalletBalances(): Promise<WalletSummary> {
  const envelope = await apiJson<ApiEnvelope<Record<string, unknown>>>(
    '/api/v1/wallets',
  );
  return normalizeWalletSummary(unwrapData(envelope));
}

export async function fetchWalletLedgerPage(
  walletType: 'DIRECT' | 'TEAM',
  page = 1,
  limit = 100,
): Promise<LedgerEntry[]> {
  const res = await apiJson<PaginatedLedgerResponse>(
    `/api/v1/wallets/${walletType}/ledger?page=${page}&limit=${limit}`,
  );
  return (res.data ?? []).map((row) =>
    normalizeLedgerEntry(row as Record<string, unknown>),
  );
}

const WALLET_TX_LIMIT = 100;

/** Balances, platform wallet info, and merged recent ledger rows (newest first). */
export async function fetchWalletPageData(): Promise<{
  balances: WalletSummary;
  secureBalancePaise: number | null;
  platformWalletLinked: boolean;
  ledgerEntries: LedgerEntry[];
}> {
  const [balances, profile, directLedger, teamLedger] = await Promise.all([
    fetchWalletBalances(),
    fetchMyProfile(),
    fetchWalletLedgerPage('DIRECT', 1, WALLET_TX_LIMIT),
    fetchWalletLedgerPage('TEAM', 1, WALLET_TX_LIMIT),
  ]);

  const ledgerEntries = [...directLedger, ...teamLedger]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, WALLET_TX_LIMIT);

  return {
    balances,
    secureBalancePaise: profile.secure_wallet_balance_paise ?? null,
    platformWalletLinked: Boolean(profile.secure_wallet_external_id?.trim()),
    ledgerEntries,
  };
}
