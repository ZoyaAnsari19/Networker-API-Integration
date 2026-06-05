import {
  listUsers,
  listWalletLedger,
  type AdminUserRow,
  type ApiLedgerEntry,
} from "@/lib/admin-api";
import { inDateRange } from "@/lib/utils";

export interface LedgerRow {
  id: number;
  user_id: string;
  sponsor_id: string;
  user_name: string;
  wallet_type: "DIRECT" | "TEAM";
  amount: number;
  entry_type: "CREDIT" | "DEBIT";
  source: string;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  payer_name: string | null;
  created_at: string;
}

const LEDGER_PAGE_LIMIT = 100;
const LEDGER_MAX_PAGES = 50;

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

function mapLedgerEntry(
  entry: ApiLedgerEntry,
  userMap: Map<string, AdminUserRow>,
): LedgerRow {
  const user = userMap.get(entry.user_id);
  return {
    id: entry.id,
    user_id: entry.user_id,
    sponsor_id: user?.sponsor_id ?? "—",
    user_name: user?.full_name ?? entry.user_id.slice(0, 8),
    wallet_type: entry.wallet_type as "DIRECT" | "TEAM",
    amount: entry.amount,
    entry_type: entry.entry_type as "CREDIT" | "DEBIT",
    source: entry.source,
    reference_id: entry.reference_id ?? null,
    reference_type: entry.reference_type ?? null,
    description: entry.description ?? null,
    payer_name: entry.payer_name ?? null,
    created_at: entry.created_at,
  };
}

async function fetchWalletLedgerPages(
  walletType: "DIRECT" | "TEAM",
): Promise<ApiLedgerEntry[]> {
  let page = 1;
  let totalPages = 1;
  const all: ApiLedgerEntry[] = [];

  while (page <= totalPages && page <= LEDGER_MAX_PAGES) {
    const res = await listWalletLedger({
      walletType,
      page,
      limit: LEDGER_PAGE_LIMIT,
    });
    all.push(...res.data);
    totalPages = res.totalPages;
    page += 1;
  }

  return all;
}

function sortLedgerRows(rows: LedgerRow[]): LedgerRow[] {
  return [...rows].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function fetchAllLedgerRows(): Promise<LedgerRow[]> {
  const userMap = await buildUserMap();
  const [direct, team] = await Promise.all([
    fetchWalletLedgerPages("DIRECT"),
    fetchWalletLedgerPages("TEAM"),
  ]);

  return sortLedgerRows(
    [...direct, ...team].map((entry) => mapLedgerEntry(entry, userMap)),
  );
}

export async function fetchRecentLedgerRows(limit = 5): Promise<LedgerRow[]> {
  const userMap = await buildUserMap();
  const [direct, team] = await Promise.all([
    listWalletLedger({ walletType: "DIRECT", page: 1, limit: LEDGER_PAGE_LIMIT }),
    listWalletLedger({ walletType: "TEAM", page: 1, limit: LEDGER_PAGE_LIMIT }),
  ]);

  return sortLedgerRows(
    [...direct.data, ...team.data].map((entry) => mapLedgerEntry(entry, userMap)),
  ).slice(0, limit);
}

export function filterLedgerRows(
  rows: LedgerRow[],
  search: string,
  walletFilter: string,
  sourceFilter: string,
  entryFilter: string,
  dateFrom: string,
  dateTo: string,
): LedgerRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((e) => {
    if (walletFilter && e.wallet_type !== walletFilter) return false;
    if (sourceFilter && e.source !== sourceFilter) return false;
    if (entryFilter && e.entry_type !== entryFilter) return false;
    if (!inDateRange(e.created_at, dateFrom, dateTo)) return false;
    if (!q) return true;
    const hay = [
      e.user_name,
      e.sponsor_id,
      e.description,
      e.reference_id,
      e.source,
      e.payer_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function computeLedgerTotals(rows: LedgerRow[]) {
  let credit = 0;
  let debit = 0;
  for (const e of rows) {
    if (e.entry_type === "CREDIT") credit += e.amount;
    else debit += e.amount;
  }
  return { credit, debit, net: credit - debit };
}
