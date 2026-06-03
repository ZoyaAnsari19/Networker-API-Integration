"use client";
import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  CalendarRange,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DIRECT_INCOME_INITIAL } from "@/lib/mock-data";
import { PAGE_SIZE } from "@/lib/constants";
import { cn, formatINR, formatDate, inDateRange, daysAgoYmd, todayYmd } from "@/lib/utils";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function DirectIncomePage() {
  const [search, setSearch] = useState("");
  const [cappedFilter, setCappedFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(daysAgoYmd(30));
  const [dateTo, setDateTo] = useState(todayYmd());
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DIRECT_INCOME_INITIAL.filter((r) => {
      if (!inDateRange(r.created_at, dateFrom, dateTo)) return false;
      if (cappedFilter === "capped" && !r.capped) return false;
      if (cappedFilter === "uncapped" && r.capped) return false;
      if (q) {
        const hay = [r.user_name, r.user_sponsor_id, r.downline_name, r.downline_sponsor_id, r.source_order_id].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, cappedFilter, dateFrom, dateTo]);

  const totals = useMemo(() => {
    let bv = 0, commission = 0, capped = 0, records = filtered.length;
    filtered.forEach((r) => { bv += r.bv_amount; commission += r.commission; if (r.capped) capped++; });
    const uniqueEarners = new Set(filtered.map((r) => r.user_id)).size;
    return { bv, commission, capped, records, uniqueEarners };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActive = !!search.trim() || !!cappedFilter || dateFrom !== daysAgoYmd(30) || dateTo !== todayYmd();
  const clearFilters = () => { setSearch(""); setCappedFilter(""); setDateFrom(daysAgoYmd(30)); setDateTo(todayYmd()); setPage(1); };
  const quick = (days: number) => { setDateFrom(daysAgoYmd(days)); setDateTo(todayYmd()); };

  React.useEffect(() => { setPage(1); }, [search, cappedFilter, dateFrom, dateTo]);
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const exportCsv = () => {
    const header = ["id", "created_at", "earner", "earner_sponsor_id", "downline", "downline_sponsor_id", "order_id", "bv_paise", "commission_paise", "capped", "cap_remaining_paise"];
    const rows = filtered.map((r) => [
      r.id, r.created_at, r.user_name, r.user_sponsor_id, r.downline_name, r.downline_sponsor_id, r.source_order_id,
      r.bv_amount, r.commission, r.capped ? "YES" : "NO", r.cap_remaining,
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `direct-income-${todayYmd()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
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
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Direct income</h1>
            <p className="text-sm text-[var(--text-muted)]">Commissions credited to sponsors on every downline purchase. Default 10% of BV (see Platform config).</p>
          </div>
        </div>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportCsv}>Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Commission paid", value: formatINR(totals.commission), sub: `from ${formatINR(totals.bv)} BV`, color: "emerald" as const },
          { label: "Records",         value: totals.records.toLocaleString(), sub: `${totals.uniqueEarners} unique earners`, color: "indigo" as const },
          { label: "Capped events",   value: totals.capped.toLocaleString(), sub: "Direct cap was hit", color: "amber" as const },
          { label: "Average per event", value: formatINR(Math.round(totals.commission / Math.max(1, totals.records))), sub: "Mean commission", color: "sky" as const },
        ].map((c, i) => {
          const palette: Record<string, { bg: string; text: string }> = {
            emerald: { bg: "bg-emerald-500/10", text: "text-emerald-700" },
            indigo:  { bg: "bg-indigo-500/10",  text: "text-indigo-700" },
            amber:   { bg: "bg-amber-500/10",   text: "text-amber-700" },
            sky:     { bg: "bg-sky-500/10",     text: "text-sky-700" },
          };
          const p = palette[c.color];
          return (
            <div key={i} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[var(--shadow-sm)]">
              <p className={cn("inline-block text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5", p.bg, p.text)}>{c.label}</p>
              <p className="mt-3 text-2xl font-bold text-[var(--text-primary)] tabular-nums">{c.value}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{c.sub}</p>
            </div>
          );
        })}
      </div>

      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <Input placeholder="Search earner, downline, order id…" icon={<Search className="w-4 h-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select
            options={[{ value: "", label: "All events" }, { value: "capped", label: "Only capped" }, { value: "uncapped", label: "Only uncapped" }]}
            value={cappedFilter}
            onChange={(e) => setCappedFilter(e.target.value)}
          />
          <Input type="date" label="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" label="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <div className="md:col-span-1 flex items-end">
            {hasActive && (
              <Button variant="ghost" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={clearFilters}>Clear</Button>
            )}
          </div>
          <div className="md:col-span-6 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)]"><CalendarRange className="w-3.5 h-3.5" />Quick ranges:</span>
            {[{l:"Today",n:0},{l:"7d",n:7},{l:"30d",n:30},{l:"90d",n:90},{l:"1y",n:365}].map((q) => (
              <button key={q.l} type="button" onClick={() => quick(q.n)} className="px-2.5 py-1 rounded-full border border-[var(--border)] text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-slate-50 transition-colors">{q.l}</button>
            ))}
          </div>
        </div>
      </Card>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-slate-50/95">
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Date</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Earner (sponsor)</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Downline buyer</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Order</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">BV</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">Commission</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">Cap remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {pageData.map((r) => (
                <tr key={r.id} className={cn("hover:bg-slate-50/80 transition-colors", r.capped && "bg-amber-50/30")}>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="text-sm text-[var(--text-primary)]">{formatDate(r.created_at, false)}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{r.user_name}</p>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">{r.user_sponsor_id}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-[var(--text-primary)]">{r.downline_name}</p>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">{r.downline_sponsor_id}</p>
                  </td>
                  <td className="px-5 py-4 text-[11px] font-mono text-[var(--text-muted)]">{r.source_order_id}</td>
                  <td className="px-5 py-4 text-right font-medium tabular-nums text-[var(--text-secondary)]">{formatINR(r.bv_amount)}</td>
                  <td className="px-5 py-4 text-right font-bold tabular-nums text-emerald-700">+{formatINR(r.commission)}</td>
                  <td className="px-5 py-4 text-right tabular-nums">
                    {r.capped ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> capped
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">{formatINR(r.cap_remaining)}</span>
                    )}
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-[var(--text-muted)]">No direct income for this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages} · {filtered.length} events</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} icon={<ChevronLeft className="w-3.5 h-3.5" />}>Prev</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} icon={<ChevronRight className="w-3.5 h-3.5" />} iconPosition="right">Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
