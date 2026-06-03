"use client";
import React, { useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  CalendarRange,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LEDGER_INITIAL, type LedgerEntry } from "@/lib/mock-data";
import {
  PAGE_SIZE,
  WALLET_TYPE_OPTIONS,
  LEDGER_SOURCE_OPTIONS,
  ENTRY_TYPE_OPTIONS,
} from "@/lib/constants";
import { cn, formatINR, formatDate, inDateRange, daysAgoYmd, todayYmd } from "@/lib/utils";

function sourceLabel(s: LedgerEntry["source"]) {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function LedgerPage() {
  const [search, setSearch] = useState("");
  const [walletFilter, setWalletFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [entryFilter, setEntryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return LEDGER_INITIAL.filter((e) => {
      if (walletFilter && e.wallet_type !== walletFilter) return false;
      if (sourceFilter && e.source !== sourceFilter) return false;
      if (entryFilter && e.entry_type !== entryFilter) return false;
      if (!inDateRange(e.created_at, dateFrom, dateTo)) return false;
      if (q) {
        const hay = [e.user_name, e.sponsor_id, e.description, e.reference_id, e.source].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, walletFilter, sourceFilter, entryFilter, dateFrom, dateTo]);

  const totals = useMemo(() => {
    let credit = 0, debit = 0;
    filtered.forEach((e) => { if (e.entry_type === "CREDIT") credit += e.amount; else debit += e.amount; });
    return { credit, debit, net: credit - debit };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActive = !!search.trim() || !!walletFilter || !!sourceFilter || !!entryFilter || !!dateFrom || !!dateTo;
  const clearFilters = () => {
    setSearch(""); setWalletFilter(""); setSourceFilter(""); setEntryFilter("");
    setDateFrom(""); setDateTo(""); setPage(1);
  };

  React.useEffect(() => { setPage(1); }, [search, walletFilter, sourceFilter, entryFilter, dateFrom, dateTo]);
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const exportCsv = () => {
    const header = ["id", "created_at", "user", "sponsor_id", "wallet_type", "entry_type", "source", "reference_id", "amount_paise", "description"];
    const rows = filtered.map((e) => [
      e.id, e.created_at, e.user_name, e.sponsor_id, e.wallet_type, e.entry_type,
      e.source, e.reference_id ?? "", e.amount, e.description ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ledger-${todayYmd()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const quick = (days: number) => { setDateFrom(daysAgoYmd(days)); setDateTo(todayYmd()); };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-md text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Wallet ledger</h1>
            <p className="text-sm text-[var(--text-muted)]">Double-entry log of credits &amp; debits across DIRECT and TEAM wallets.</p>
          </div>
        </div>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportCsv}>Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-white p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><ArrowUpRight className="w-4 h-4" /></div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Credits</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--text-primary)] tabular-nums">{formatINR(totals.credit)}</p>
        </div>
        <div className="rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50/70 to-white p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center"><ArrowDownRight className="w-4 h-4" /></div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Debits</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--text-primary)] tabular-nums">{formatINR(totals.debit)}</p>
        </div>
        <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/70 to-white p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center"><BookOpen className="w-4 h-4" /></div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Net (filtered)</p>
          </div>
          <p className={cn("mt-3 text-2xl font-bold tabular-nums", totals.net >= 0 ? "text-emerald-700" : "text-rose-700")}>
            {totals.net >= 0 ? "+" : "−"}{formatINR(Math.abs(totals.net))}
          </p>
        </div>
      </div>

      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <Input placeholder="Search user, SPF code, ref, description…" icon={<Search className="w-4 h-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select options={WALLET_TYPE_OPTIONS} value={walletFilter} onChange={(e) => setWalletFilter(e.target.value)} />
          <Select options={ENTRY_TYPE_OPTIONS} value={entryFilter} onChange={(e) => setEntryFilter(e.target.value)} />
          <Select options={LEDGER_SOURCE_OPTIONS} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} />
          <div />
          <Input type="date" label="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" label="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <div className="md:col-span-4 flex flex-wrap items-end gap-2 justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] px-2"><CalendarRange className="w-3.5 h-3.5" />Quick:</span>
              {[{l:"Today",n:0},{l:"7d",n:7},{l:"30d",n:30},{l:"90d",n:90}].map((q) => (
                <button key={q.l} type="button" onClick={() => quick(q.n)} className="px-2.5 py-1 rounded-full border border-[var(--border)] text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-slate-50 transition-colors">{q.l}</button>
              ))}
            </div>
            {hasActive && (
              <Button variant="ghost" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={clearFilters}>Clear filters</Button>
            )}
          </div>
        </div>
      </Card>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-slate-50/95">
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Date</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">User</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Wallet</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Source</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Entry</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Reference</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {pageData.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="text-sm text-[var(--text-primary)]">{formatDate(e.created_at, false)}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{new Date(e.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{e.user_name}</p>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">{e.sponsor_id}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold",
                      e.wallet_type === "DIRECT" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700")}>
                      {e.wallet_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{sourceLabel(e.source)}</td>
                  <td className="px-5 py-4"><Badge status={e.entry_type} /></td>
                  <td className="px-5 py-4 text-[11px] font-mono text-[var(--text-muted)]">{e.reference_id ?? "—"}</td>
                  <td className={cn("px-5 py-4 text-right font-semibold tabular-nums", e.entry_type === "CREDIT" ? "text-emerald-700" : "text-rose-700")}>
                    {e.entry_type === "CREDIT" ? "+" : "−"}{formatINR(e.amount)}
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-[var(--text-muted)]">No ledger entries match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages} · {filtered.length} entries</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} icon={<ChevronLeft className="w-3.5 h-3.5" />}>Prev</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} icon={<ChevronRight className="w-3.5 h-3.5" />} iconPosition="right">Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
