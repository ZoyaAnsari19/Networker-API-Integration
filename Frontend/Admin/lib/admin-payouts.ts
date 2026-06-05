import {
  listPayouts,
  listUsers,
  type AdminPayoutRow,
  type AdminUserRow,
} from "@/lib/admin-api";
import { inDateRange } from "@/lib/utils";

export interface PayoutRow {
  payout_id: string;
  user_id: string;
  user_name: string;
  sponsor_id: string;
  email: string;
  wallet_type: string;
  requested_amount: number;
  approved_amount: number | null;
  status: string;
  admin_note: string | null;
  sc_tx_reference: string | null;
  requested_at: string;
  processed_at: string | null;
}

async function buildUserMap(): Promise<Map<string, AdminUserRow>> {
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  const map = new Map<string, AdminUserRow>();

  while (page <= totalPages) {
    const res = await listUsers({ page, limit });
    for (const u of res.data) {
      map.set(u.user_id, u);
    }
    totalPages = res.totalPages;
    page += 1;
  }

  return map;
}

function mapPayout(p: AdminPayoutRow, userMap: Map<string, AdminUserRow>): PayoutRow {
  const user = userMap.get(p.user_id);
  return {
    payout_id: p.payout_id,
    user_id: p.user_id,
    user_name: user?.full_name ?? "Unknown",
    sponsor_id: user?.sponsor_id ?? "—",
    email: p.sc_user_email ?? user?.email ?? "—",
    wallet_type: p.wallet_type,
    requested_amount: p.requested_amount,
    approved_amount: p.approved_amount ?? null,
    status: p.status,
    admin_note: p.admin_note ?? null,
    sc_tx_reference: p.sc_tx_reference ?? null,
    requested_at: p.requested_at,
    processed_at: p.processed_at ?? null,
  };
}

export async function fetchAllPayouts(status?: string): Promise<PayoutRow[]> {
  const userMap = await buildUserMap();
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  const all: PayoutRow[] = [];

  while (page <= totalPages) {
    const res = await listPayouts({
      status: status !== undefined ? status : "",
      page,
      limit,
    });
    all.push(...res.data.map((p) => mapPayout(p, userMap)));
    totalPages = res.totalPages;
    page += 1;
  }

  return all;
}

export function filterPayoutRows(
  rows: PayoutRow[],
  search: string,
  statusFilter: string,
  walletFilter: string,
  dateFrom: string,
  dateTo: string,
): PayoutRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (walletFilter && p.wallet_type !== walletFilter) return false;
    if (!inDateRange(p.requested_at, dateFrom, dateTo)) return false;
    if (!q) return true;
    const hay = [p.user_name, p.sponsor_id, p.email, p.payout_id, p.user_id]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function computePayoutStats(rows: PayoutRow[]) {
  const pending = rows.filter((p) => p.status === "PENDING");
  const approved = rows.filter(
    (p) => p.status === "APPROVED" || p.status === "PROCESSING",
  );
  const completed = rows.filter((p) => p.status === "COMPLETED");
  const rejected = rows.filter(
    (p) => p.status === "REJECTED" || p.status === "FAILED",
  );
  const sum = (arr: PayoutRow[], key: "requested_amount" | "approved_amount") =>
    arr.reduce((a, b) => a + (Number(b[key] ?? 0) || 0), 0);

  return {
    pendingCount: pending.length,
    pendingAmount: sum(pending, "requested_amount"),
    approvedCount: approved.length,
    approvedAmount: sum(approved, "approved_amount"),
    completedCount: completed.length,
    completedAmount: sum(completed, "approved_amount"),
    rejectedCount: rejected.length,
  };
}
