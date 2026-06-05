import {
  listCommissionConfigs,
  listUsers,
  listWalletLedger,
  type AdminUserRow,
  type ApiLedgerEntry,
} from "@/lib/admin-api";
import { configValueToString } from "@/lib/admin-platform-config";
import { inDateRange } from "@/lib/utils";

export interface DirectIncomeRow {
  id: number;
  user_id: string;
  user_sponsor_id: string;
  user_name: string;
  source_order_id: string;
  downline_sponsor_id: string;
  downline_name: string;
  source: string;
  bv_amount: number | null;
  commission: number;
  capped: boolean;
  cap_remaining: number | null;
  created_at: string;
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 50;
const DIRECT_SOURCES = new Set(["DIRECT_COMMISSION", "FRANCHISE_COMMISSION"]);

async function buildUserMaps(): Promise<{
  byId: Map<string, AdminUserRow>;
  byName: Map<string, AdminUserRow>;
}> {
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  const byId = new Map<string, AdminUserRow>();
  const byName = new Map<string, AdminUserRow>();

  while (page <= totalPages) {
    const res = await listUsers({ page, limit });
    for (const u of res.data) {
      byId.set(u.user_id, u);
      byName.set(u.full_name.toLowerCase().trim(), u);
    }
    totalPages = res.totalPages;
    page += 1;
  }

  return { byId, byName };
}

async function getCommissionPercents(): Promise<{
  direct: number;
  franchise: number;
}> {
  try {
    const rows = await listCommissionConfigs();
    const byKey = new Map(rows.map((r) => [r.config_key, r]));
    const direct =
      parseFloat(
        configValueToString(byKey.get("direct_commission_percent")?.config_value),
      ) || 10;
    const franchise =
      parseFloat(
        configValueToString(byKey.get("franchise_commission_percent")?.config_value),
      ) || 10;
    return { direct, franchise };
  } catch {
    return { direct: 10, franchise: 10 };
  }
}

function estimateBv(
  commission: number,
  source: string,
  percents: { direct: number; franchise: number },
): number | null {
  const pct =
    source === "FRANCHISE_COMMISSION" ? percents.franchise : percents.direct;
  if (!pct || pct <= 0) return null;
  return Math.round((commission * 100) / pct);
}

function resolveDownline(
  entry: ApiLedgerEntry,
  byName: Map<string, AdminUserRow>,
): { name: string; sponsor_id: string } {
  const payer = entry.payer_name?.trim();
  if (payer) {
    const user = byName.get(payer.toLowerCase());
    return { name: payer, sponsor_id: user?.sponsor_id ?? "—" };
  }
  return { name: "—", sponsor_id: "—" };
}

function mapDirectIncomeRow(
  entry: ApiLedgerEntry,
  byId: Map<string, AdminUserRow>,
  byName: Map<string, AdminUserRow>,
  percents: { direct: number; franchise: number },
): DirectIncomeRow {
  const earner = byId.get(entry.user_id);
  const downline = resolveDownline(entry, byName);
  return {
    id: entry.id,
    user_id: entry.user_id,
    user_sponsor_id: earner?.sponsor_id ?? "—",
    user_name: earner?.full_name ?? entry.user_id.slice(0, 8),
    source_order_id: entry.reference_id ?? "—",
    downline_sponsor_id: downline.sponsor_id,
    downline_name: downline.name,
    source: entry.source,
    bv_amount: estimateBv(entry.amount, entry.source, percents),
    commission: entry.amount,
    capped: false,
    cap_remaining: null,
    created_at: entry.created_at,
  };
}

async function fetchDirectLedgerPages(): Promise<ApiLedgerEntry[]> {
  let page = 1;
  let totalPages = 1;
  const all: ApiLedgerEntry[] = [];

  while (page <= totalPages && page <= MAX_PAGES) {
    const res = await listWalletLedger({
      walletType: "DIRECT",
      page,
      limit: PAGE_LIMIT,
    });
    all.push(...res.data);
    totalPages = res.totalPages;
    page += 1;
  }

  return all;
}

export async function fetchAllDirectIncomeRows(): Promise<DirectIncomeRow[]> {
  const [{ byId, byName }, percents, ledger] = await Promise.all([
    buildUserMaps(),
    getCommissionPercents(),
    fetchDirectLedgerPages(),
  ]);

  return ledger
    .filter(
      (e) =>
        e.entry_type === "CREDIT" &&
        e.amount > 0 &&
        DIRECT_SOURCES.has(e.source),
    )
    .map((e) => mapDirectIncomeRow(e, byId, byName, percents))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

export function filterDirectIncomeRows(
  rows: DirectIncomeRow[],
  search: string,
  cappedFilter: string,
  dateFrom: string,
  dateTo: string,
): DirectIncomeRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (!inDateRange(r.created_at, dateFrom, dateTo)) return false;
    if (cappedFilter === "capped" && !r.capped) return false;
    if (cappedFilter === "uncapped" && r.capped) return false;
    if (!q) return true;
    const hay = [
      r.user_name,
      r.user_sponsor_id,
      r.downline_name,
      r.downline_sponsor_id,
      r.source_order_id,
      r.source,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function computeDirectIncomeTotals(rows: DirectIncomeRow[]) {
  let bv = 0;
  let commission = 0;
  let capped = 0;
  let bvKnown = 0;
  for (const r of rows) {
    commission += r.commission;
    if (r.bv_amount != null) {
      bv += r.bv_amount;
      bvKnown += 1;
    }
    if (r.capped) capped += 1;
  }
  return {
    bv,
    commission,
    capped,
    records: rows.length,
    uniqueEarners: new Set(rows.map((r) => r.user_id)).size,
    bvKnown,
  };
}
