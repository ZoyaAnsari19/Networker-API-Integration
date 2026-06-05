"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  CalendarRange,
  AlertTriangle,
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
  computeDirectIncomeTotals,
  fetchAllDirectIncomeRows,
  filterDirectIncomeRows,
  type DirectIncomeRow,
} from "@/lib/admin-direct-income";
import { ApiError } from "@/lib/api-client";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function DirectIncomePage() {
  const [rows, setRows] = useState<DirectIncomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [cappedFilter, setCappedFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(daysAgoYmd(30));
  const [dateTo, setDateTo] = useState(todayYmd());
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllDirectIncomeRows();
      setRows(data);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load direct income";
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
    () => filterDirectIncomeRows(rows, search, cappedFilter, dateFrom, dateTo),
    [rows, search, cappedFilter, dateFrom, dateTo],
  );

  const totals = useMemo(() => computeDirectIncomeTotals(filtered), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActive =
    !!search.trim() ||
    !!cappedFilter ||
    dateFrom !== daysAgoYmd(30) ||
    dateTo !== todayYmd();

  const clearFilters = () => {
    setSearch("");
    setCappedFilter("");
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
  }, [search, cappedFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const exportCsv = () => {
    const header = [
      "id",
      "created_at",
      "earner",
      "earner_sponsor_id",
      "downline",
      "downline_sponsor_id",
      "order_id",
      "source",
      "bv_paise",
      "commission_paise",
      "capped",
      "cap_remaining_paise",
    ];
    const csvRows = filtered.map((r) => [
      r.id,
      r.created_at,
      r.user_name,
      r.user_sponsor_id,
      r.downline_name,
      r.downline_sponsor_id,
      r.source_order_id,
      r.source,
      r.bv_amount ?? "",
      r.commission,
      r.capped ? "YES" : "NO",
      r.cap_remaining ?? "",
    ]);
    const csv = [header, ...csvRows]
      .map((r) => r.map(csvEscape).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `direct-income-${todayYmd()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md text-white">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Direct income
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Direct and franchise commission credits from the DIRECT wallet ledger.
              BV is estimated from platform commission rates when cap data is unavailable.
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
              Could not load direct income
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
            label: "Commission paid",
            value: loading ? "…" : formatINR(totals.commission),
            sub: loading
              ? "Loading…"
              : totals.bvKnown > 0
                ? `from ${formatINR(totals.bv)} est. BV`
                : "BV estimate unavailable",
            color: "emerald" as const,
          },
          {
            label: "Records",
            value: loading ? "…" : totals.records.toLocaleString(),
            sub: loading ? "Loading…" : `${totals.uniqueEarners} unique earners`,
            color: "indigo" as const,
          },
          {
            label: "Capped events",
            value: loading ? "…" : totals.capped.toLocaleString(),
            sub: "Requires cap reporting API",
            color: "amber" as const,
          },
          {
            label: "Average per event",
            value: loading
              ? "…"
              : formatINR(
                  Math.round(totals.commission / Math.max(1, totals.records)),
                ),
            sub: "Mean commission",
            color: "sky" as const,
          },
        ].map((c, i) => {
          const palette: Record<string, { bg: string; text: string }> = {
            emerald: { bg: "bg-emerald-500/10", text: "text-emerald-700" },
            indigo: { bg: "bg-indigo-500/10", text: "text-indigo-700" },
            amber: { bg: "bg-amber-500/10", text: "text-amber-700" },
            sky: { bg: "bg-sky-500/10", text: "text-sky-700" },
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
              placeholder="Search earner, downline, order id…"
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            options={[
              { value: "", label: "All events" },
              { value: "capped", label: "Only capped" },
              { value: "uncapped", label: "Only uncapped" },
            ]}
            value={cappedFilter}
            onChange={(e) => setCappedFilter(e.target.value)}
          />
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
          <div className="md:col-span-1 flex items-end">
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
          <div className="md:col-span-6 flex flex-wrap items-center gap-1.5">
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
            Loading direct income…
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
                      Earner (sponsor)
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Downline buyer
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Order
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      BV
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      Commission
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      Cap remaining
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {pageData.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors",
                        r.capped && "bg-amber-50/30",
                      )}
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-sm text-[var(--text-primary)]">
                          {formatDate(r.created_at, false)}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
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
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-[var(--text-primary)]">
                          {r.downline_name}
                        </p>
                        <p className="text-[11px] font-mono text-[var(--text-muted)]">
                          {r.downline_sponsor_id}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-[11px] font-mono text-[var(--text-muted)]">
                        {r.source_order_id}
                      </td>
                      <td className="px-5 py-4 text-right font-medium tabular-nums text-[var(--text-secondary)]">
                        {r.bv_amount != null ? formatINR(r.bv_amount) : "—"}
                      </td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums text-emerald-700">
                        +{formatINR(r.commission)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        {r.capped ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> capped
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pageData.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-16 text-center text-sm text-[var(--text-muted)]"
                      >
                        No direct income for this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">
                Page {page} of {totalPages} · {filtered.length} events
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
