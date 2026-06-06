import {
  listCommissionConfigs,
  listUsers,
  listWalletLedger,
  type AdminUserRow,
  type ApiLedgerEntry,
} from "@/lib/admin-api";
import { configValueToString } from "@/lib/admin-platform-config";
import { inDateRange } from "@/lib/utils";

export interface BinaryIncomeRow {
  id: number;
  user_id: string;
  user_sponsor_id: string;
  user_name: string;
  source_order_id: string;
  matched_bv: number | null;
  commission: number;
  level_bonus: number;
  total_credited: number;
  cap_deducted: number;
  pair_number: number;
  carry_forward_bv: number | null;
  carry_forward_leg: "LEFT" | "RIGHT" | null;
  created_at: string;
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 50;
const BINARY_SOURCES = new Set(["BINARY_MATCH", "LEVEL_BONUS"]);

type GroupedPair = {
  user_id: string;
  reference_id: string | null;
  matchEntry: ApiLedgerEntry | null;
  commission: number;
  level_bonus: number;
  created_at: string;
  row_id: number;
};

function groupKey(entry: ApiLedgerEntry): string {
  const ref = entry.reference_id?.trim() || String(entry.id);
  return `${entry.user_id}|${ref}`;
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

async function getBinaryMatchPercent(): Promise<number> {
  try {
    const rows = await listCommissionConfigs();
    const row = rows.find((r) => r.config_key === "binary_match_percent");
    const pct = parseFloat(configValueToString(row?.config_value));
    return pct > 0 ? pct : 10;
  } catch {
    return 10;
  }
}

function estimateMatchedBv(
  commission: number,
  binaryPercent: number,
): number | null {
  if (!commission || binaryPercent <= 0) return null;
  return Math.round((commission * 100) / binaryPercent);
}

async function fetchTeamLedgerPages(): Promise<ApiLedgerEntry[]> {
  let page = 1;
  let totalPages = 1;
  const all: ApiLedgerEntry[] = [];

  while (page <= totalPages && page <= MAX_PAGES) {
    const res = await listWalletLedger({
      walletType: "TEAM",
      page,
      limit: PAGE_LIMIT,
    });
    all.push(...res.data);
    totalPages = res.totalPages;
    page += 1;
  }

  return all;
}

function buildGroupedPairs(entries: ApiLedgerEntry[]): GroupedPair[] {
  const groups = new Map<string, GroupedPair>();

  for (const entry of entries) {
    if (entry.entry_type !== "CREDIT" || entry.amount <= 0) continue;
    if (!BINARY_SOURCES.has(entry.source)) continue;

    const key = groupKey(entry);
    let group = groups.get(key);
    if (!group) {
      group = {
        user_id: entry.user_id,
        reference_id: entry.reference_id?.trim() || null,
        matchEntry: null,
        commission: 0,
        level_bonus: 0,
        created_at: entry.created_at,
        row_id: entry.id,
      };
      groups.set(key, group);
    }

    if (entry.source === "BINARY_MATCH") {
      group.commission += entry.amount;
      group.matchEntry = entry;
    } else {
      group.level_bonus += entry.amount;
    }

    if (
      new Date(entry.created_at).getTime() <
      new Date(group.created_at).getTime()
    ) {
      group.created_at = entry.created_at;
    }
  }

  return Array.from(groups.values()).filter(
    (g) => g.commission > 0 || g.level_bonus > 0,
  );
}

function assignPairNumbers(rows: BinaryIncomeRow[]): BinaryIncomeRow[] {
  const byUserDay = new Map<string, BinaryIncomeRow[]>();

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    const key = `${row.user_id}|${day}`;
    const list = byUserDay.get(key) ?? [];
    list.push(row);
    byUserDay.set(key, list);
  }

  for (const list of byUserDay.values()) {
    list.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    list.forEach((row, idx) => {
      row.pair_number = idx + 1;
    });
  }

  return rows;
}

function mapBinaryIncomeRow(
  group: GroupedPair,
  userMap: Map<string, AdminUserRow>,
  binaryPercent: number,
): BinaryIncomeRow {
  const user = userMap.get(group.user_id);
  const commission = group.commission;
  const levelBonus = group.level_bonus;

  return {
    id: group.matchEntry?.id ?? group.row_id,
    user_id: group.user_id,
    user_sponsor_id: user?.sponsor_id ?? "—",
    user_name: user?.full_name ?? group.user_id.slice(0, 8),
    source_order_id: group.reference_id ?? "—",
    matched_bv: estimateMatchedBv(commission, binaryPercent),
    commission,
    level_bonus: levelBonus,
    total_credited: commission + levelBonus,
    cap_deducted: 0,
    pair_number: 0,
    carry_forward_bv: null,
    carry_forward_leg: null,
    created_at: group.created_at,
  };
}

export async function fetchAllBinaryIncomeRows(): Promise<BinaryIncomeRow[]> {
  const [userMap, binaryPercent, ledger] = await Promise.all([
    buildUserMap(),
    getBinaryMatchPercent(),
    fetchTeamLedgerPages(),
  ]);

  const rows = buildGroupedPairs(ledger)
    .map((g) => mapBinaryIncomeRow(g, userMap, binaryPercent))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  return assignPairNumbers(rows);
}

export function filterBinaryIncomeRows(
  rows: BinaryIncomeRow[],
  search: string,
  pairFilter: string,
  capFilter: string,
  dateFrom: string,
  dateTo: string,
): BinaryIncomeRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (!inDateRange(r.created_at, dateFrom, dateTo)) return false;
    if (pairFilter) {
      if (pairFilter === "10+" && r.pair_number < 10) return false;
      if (pairFilter !== "10+" && String(r.pair_number) !== pairFilter)
        return false;
    }
    if (capFilter === "capped" && r.cap_deducted === 0) return false;
    if (capFilter === "uncapped" && r.cap_deducted > 0) return false;
    if (!q) return true;
    const hay = [r.user_name, r.user_sponsor_id, r.source_order_id]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function computeBinaryIncomeTotals(rows: BinaryIncomeRow[]) {
  let matched = 0;
  let match = 0;
  let level = 0;
  let total = 0;
  let deducted = 0;
  let matchedKnown = 0;

  for (const r of rows) {
    match += r.commission;
    level += r.level_bonus;
    total += r.total_credited;
    deducted += r.cap_deducted;
    if (r.matched_bv != null) {
      matched += r.matched_bv;
      matchedKnown += 1;
    }
  }

  return {
    matched,
    match,
    level,
    total,
    deducted,
    events: rows.length,
    earners: new Set(rows.map((r) => r.user_id)).size,
    matchedKnown,
  };
}
