"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  GitBranch,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  CalendarRange,
  Scissors,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/lib/constants";
import { cn, formatINR, formatDate, daysAgoYmd, todayYmd } from "@/lib/utils";
import {
  computeBinaryIncomeTotals,
  fetchAllBinaryIncomeRows,
  filterBinaryIncomeRows,
  type BinaryIncomeRow,
} from "@/lib/admin-binary-income";
import { ApiError } from "@/lib/api-client";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function BinaryIncomePage() {
  const [rows, setRows] = useState<BinaryIncomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [pairFilter, setPairFilter] = useState("");
  const [capFilter, setCapFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(daysAgoYmd(30));
  const [dateTo, setDateTo] = useState(todayYmd());
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllBinaryIncomeRows();
      setRows(data);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load binary income";
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filtered = useMemo(
    () =>
      filterBinaryIncomeRows(
        rows,
        search,
        pairFilter,
        capFilter,
        dateFrom,
        dateTo,
      ),
    [rows, search, pairFilter, capFilter, dateFrom, dateTo],
  );

  const totals = useMemo(() => computeBinaryIncomeTotals(filtered), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActive =
    !!search.trim() ||
    !!pairFilter ||
    !!capFilter ||
    dateFrom !== daysAgoYmd(30) ||
    dateTo !== todayYmd();

  const clearFilters = () => {
    setSearch("");
    setPairFilter("");
    setCapFilter("");
    setDateFrom(daysAgoYmd(30));
    setDateTo(todayYmd());
    setPage(1);
  };

  const quick = (days: number) => {
    setDateFrom(daysAgoYmd(days));
    setDateTo(todayYmd());
  };

  useEffect(() => {
    setPage(1);
  }, [search, pairFilter, capFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const exportCsv = () => {
    const header = [
      "id",
      "created_at",
      "earner",
      "earner_sponsor_id",
      "order_id",
      "pair_number",
      "matched_bv_paise",
      "match_commission_paise",
      "level_bonus_paise",
      "total_credited_paise",
      "cap_deducted_paise",
      "carry_leg",
      "carry_bv_paise",
    ];
    const csvRows = filtered.map((r) => [
      r.id,
      r.created_at,
      r.user_name,
      r.user_sponsor_id,
      r.source_order_id,
      r.pair_number,
      r.matched_bv ?? "",
      r.commission,
      r.level_bonus,
      r.total_credited,
      r.cap_deducted,
      r.carry_forward_leg ?? "",
      r.carry_forward_bv ?? "",
    ]);
    const csv = [header, ...csvRows]
      .map((r) => r.map(csvEscape).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `binary-income-${todayYmd()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-md text-white">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Binary income
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Pair-match and level bonus credits from the TEAM wallet ledger.
              Matched BV is estimated from platform rates; cap and carry-forward
              require pair-match reporting API.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          icon={<Download className="w-4 h-4" />}
          onClick={exportCsv}
          disabled={loading || filtered.length === 0}
        >
          Export CSV
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-800">
              Could not load binary income
            </p>
            <p className="text-sm text-rose-700 mt-0.5">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-rose-700"
              onClick={() => void loadRows()}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total credited",
            value: loading ? "…" : formatINR(totals.total),
            sub: loading ? "Loading…" : `across ${totals.events} pairs`,
            color: "emerald" as const,
          },
          {
            label: "Match commission",
            value: loading ? "…" : formatINR(totals.match),
            sub: loading
              ? "Loading…"
              : totals.matchedKnown > 0
                ? `from ${formatINR(totals.matched)} est. BV`
                : "BV estimate unavailable",
            color: "sky" as const,
          },
          {
            label: "Level bonus",
            value: loading ? "…" : formatINR(totals.level),
            sub: loading ? "Loading…" : `${totals.earners} unique earners`,
            color: "violet" as const,
          },
          {
            label: "Cap deducted",
            value: loading ? "…" : formatINR(totals.deducted),
            sub: "Requires pair-match reporting API",
            color: "amber" as const,
          },
        ].map((c, i) => {
          const palette: Record<string, { bg: string; text: string }> = {
            emerald: { bg: "bg-emerald-500/10", text: "text-emerald-700" },
            sky: { bg: "bg-sky-500/10", text: "text-sky-700" },
            violet: { bg: "bg-violet-500/10", text: "text-violet-700" },
            amber: { bg: "bg-amber-500/10", text: "text-amber-700" },
          };
          const p = palette[c.color];
          return (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[var(--shadow-sm)]"
            >
              <p
                className={cn(
                  "inline-block text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5",
                  p.bg,
                  p.text,
                )}
              >
                {c.label}
              </p>
              <p className="mt-3 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {c.value}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{c.sub}</p>
            </div>
          );
        })}
      </div>

      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Search earner or order id…"
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            options={[
              { value: "", label: "Pair # — Any" },
              ...Array.from({ length: 9 }, (_, i) => ({
                value: String(i + 1),
                label: `Pair #${i + 1}`,
              })),
              { value: "10+", label: "Pair #10+" },
            ]}
            value={pairFilter}
            onChange={(e) => setPairFilter(e.target.value)}
          />
          <Select
            options={[
              { value: "", label: "Cap — Any" },
              { value: "capped", label: "Only capped" },
              { value: "uncapped", label: "Only uncapped" },
            ]}
            value={capFilter}
            onChange={(e) => setCapFilter(e.target.value)}
          />
          <div className="flex items-end">
            {hasActive && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}
          </div>
          <Input
            type="date"
            label="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            type="date"
            label="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <div className="md:col-span-4 flex flex-wrap items-end gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)]">
              <CalendarRange className="w-3.5 h-3.5" />
              Quick ranges:
            </span>
            {[
              { l: "Today", n: 0 },
              { l: "7d", n: 7 },
              { l: "30d", n: 30 },
              { l: "90d", n: 90 },
              { l: "1y", n: 365 },
            ].map((q) => (
              <button
                key={q.l}
                type="button"
                onClick={() => quick(q.n)}
                className="px-2.5 py-1 rounded-full border border-[var(--border)] text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-slate-50 transition-colors"
              >
                {q.l}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-24 text-sm text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading binary income…
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50/95">
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Date
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Earner
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-center">
                      Pair #
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      Matched BV
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      Match
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      Level
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      Total
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      Carry BV
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {pageData.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors",
                        r.cap_deducted > 0 && "bg-amber-50/30",
                      )}
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p
                          className="text-sm text-[var(--text-primary)]"
                          suppressHydrationWarning
                        >
                          {formatDate(r.created_at, false)}
                        </p>
                        <p
                          className="text-[11px] text-[var(--text-muted)]"
                          suppressHydrationWarning
                        >
                          {new Date(r.created_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {r.user_name}
                        </p>
                        <p className="text-[11px] font-mono text-[var(--text-muted)]">
                          {r.user_sponsor_id}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {r.source_order_id}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold tabular-nums">
                          {r.pair_number}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-[var(--text-secondary)]">
                        {r.matched_bv != null ? formatINR(r.matched_bv) : "—"}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums font-medium text-sky-700">
                        {formatINR(r.commission)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums font-medium text-violet-700">
                        {formatINR(r.level_bonus)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        <p className="font-bold text-emerald-700">
                          +{formatINR(r.total_credited)}
                        </p>
                        {r.cap_deducted > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full mt-0.5">
                            <Scissors className="w-2.5 h-2.5" /> −
                            {formatINR(r.cap_deducted)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-[11px]">
                        <p
                          className="text-[var(--text-muted)]"
                          title="BV remaining on the heavier leg after this match"
                        >
                          {r.carry_forward_bv != null
                            ? formatINR(r.carry_forward_bv)
                            : "—"}
                        </p>
                      </td>
                    </tr>
                  ))}
                  {pageData.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-16 text-center text-sm text-[var(--text-muted)]"
                      >
                        No binary income for this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">
                Page {page} of {totalPages} · {filtered.length} pair events
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                  iconPosition="right"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
