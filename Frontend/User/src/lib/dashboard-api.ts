import { apiJson, unwrapData, type ApiEnvelope } from '@/lib/api-client';
import { fetchMyProfile } from '@/lib/profile-api';
import type { UserProfile } from '@/lib/profile-types';
import type {
  DashboardProfile,
  LedgerEntry,
  TreeView,
} from '@/lib/dashboard-types';

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

function normalizeTreeNode(
  raw: Record<string, unknown> | null | undefined,
): TreeView | undefined {
  if (!raw) return undefined;
  return {
    user_id: String(raw.user_id ?? ''),
    full_name: String(raw.full_name ?? ''),
    leg: (raw.leg as string | null) ?? null,
    left_bv: Number(raw.left_bv ?? 0),
    right_bv: Number(raw.right_bv ?? 0),
    status: String(raw.status ?? 'INACTIVE'),
    package_name:
      raw.package_name == null || raw.package_name === ''
        ? null
        : String(raw.package_name),
    left: normalizeTreeNode(raw.left as Record<string, unknown> | undefined),
    right: normalizeTreeNode(raw.right as Record<string, unknown> | undefined),
  };
}

export function profileToDashboard(p: UserProfile): DashboardProfile {
  return {
    user_id: p.user_id,
    sponsor_id: p.sponsor_id,
    full_name: p.full_name,
    email: p.email,
    phone: p.phone,
    status: p.status,
    role: p.role,
    current_package_id: p.current_package_id,
    package_activated_at: p.package_activated_at,
    monthly_income_paise: p.monthly_income_paise,
    monthly_shopping_paise: p.monthly_shopping_paise,
    income_period_ym: p.income_period_ym,
    today_binary_earned: p.today_binary_earned,
    daily_binary_cap: p.daily_binary_cap,
    placement_status: p.placement_status,
    package_name: p.package_name,
    package_amount: p.package_amount,
    direct_wallet_balance: p.direct_wallet_balance,
    team_wallet_balance: p.team_wallet_balance,
    direct_referral_count: p.direct_referral_count,
    sponsor_name: p.sponsor_name,
  };
}

/** Fetch all ledger pages for KPI + chart aggregation. */
export async function fetchAllLedgerEntries(
  walletType: 'DIRECT' | 'TEAM',
): Promise<LedgerEntry[]> {
  const limit = 100;
  const maxPages = 50;
  const all: LedgerEntry[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    const res = await apiJson<PaginatedLedgerResponse>(
      `/api/v1/wallets/${walletType}/ledger?page=${page}&limit=${limit}`,
    );
    const rows = (res.data ?? []).map((row) =>
      normalizeLedgerEntry(row as Record<string, unknown>),
    );
    all.push(...rows);
    totalPages = Math.max(1, res.meta?.total_pages ?? 1);
    page += 1;
  }

  return all;
}

export async function fetchTreeView(depth = 15): Promise<TreeView | null> {
  const envelope = await apiJson<ApiEnvelope<Record<string, unknown>>>(
    `/api/v1/tree?depth=${depth}`,
  );
  const raw = unwrapData(envelope);
  return normalizeTreeNode(raw) ?? null;
}

export async function fetchDashboardProfile(): Promise<DashboardProfile> {
  return profileToDashboard(await fetchMyProfile());
}
