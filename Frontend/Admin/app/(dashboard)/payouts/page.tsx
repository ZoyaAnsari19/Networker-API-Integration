"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Wallet,
  AlertCircle,
  CalendarRange,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PAGE_SIZE,
  PAYOUT_STATUS_OPTIONS as STATUS_BASE,
  WALLET_TYPE_OPTIONS,
} from "@/lib/constants";
import {
  cn,
  formatINR,
  formatDate,
  daysAgoYmd,
  todayYmd,
} from "@/lib/utils";
import {
  computePayoutStats,
  fetchAllPayouts,
  filterPayoutRows,
  type PayoutRow,
} from "@/lib/admin-payouts";
import { approvePayout, rejectPayout } from "@/lib/admin-api";
import { ApiError } from "@/lib/api-client";

const PAYOUT_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...STATUS_BASE,
];

export default function PayoutsPage() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [walletFilter, setWalletFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(daysAgoYmd(30));
  const [dateTo, setDateTo] = useState(todayYmd());
  const [page, setPage] = useState(1);

  const [actionModal, setActionModal] = useState<{
    mode: "approve" | "reject";
    item: PayoutRow;
  } | null>(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [note, setNote] = useState("");

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllPayouts(statusFilter || undefined);
      setRows(data);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load withdrawal requests";
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const filtered = useMemo(
    () => filterPayoutRows(rows, search, "", walletFilter, dateFrom, dateTo),
    [rows, search, walletFilter, dateFrom, dateTo],
  );

  const stats = useMemo(() => computePayoutStats(filtered), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActive =
    !!search.trim() ||
    !!statusFilter ||
    !!walletFilter ||
    dateFrom !== daysAgoYmd(30) ||
    dateTo !== todayYmd();

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setWalletFilter("");
    setDateFrom(daysAgoYmd(30));
    setDateTo(todayYmd());
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, walletFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openApprove = (p: PayoutRow) => {
    setActionModal({ mode: "approve", item: p });
    setApprovedAmount(String(p.requested_amount / 100));
    setNote("");
    setActionError(null);
  };

  const openReject = (p: PayoutRow) => {
    setActionModal({ mode: "reject", item: p });
    setNote("");
    setApprovedAmount("");
    setActionError(null);
  };

  const closeModal = () => {
    setActionModal(null);
    setActionError(null);
  };

  const submitAction = async () => {
    if (!actionModal) return;
    const { item, mode } = actionModal;
    setActionLoading(true);
    setActionError(null);
    try {
      if (mode === "approve") {
        const approvedPaise = Math.max(
          0,
          Math.round(Number(approvedAmount || 0) * 100),
        );
        await approvePayout(item.payout_id, {
          amount: approvedPaise > 0 ? approvedPaise : undefined,
          admin_note: note.trim() || undefined,
        });
      } else {
        await rejectPayout(item.payout_id, {
          admin_note: note.trim(),
        });
      }
      closeModal();
      await loadPayouts();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Action failed";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md text-white">
          <Banknote className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Withdrawal requests
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Approve or reject pending withdrawals. Approval debits the wallet and
            processes payout via Secure Coin when configured.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Pending",
            count: stats.pendingCount,
            amount: stats.pendingAmount,
            color: "amber" as const,
          },
          {
            label: "Approved / processing",
            count: stats.approvedCount,
            amount: stats.approvedAmount,
            color: "sky" as const,
          },
          {
            label: "Completed",
            count: stats.completedCount,
            amount: stats.completedAmount,
            color: "emerald" as const,
          },
          {
            label: "Rejected / failed",
            count: stats.rejectedCount,
            amount: 0,
            color: "rose" as const,
          },
        ].map((c, i) => {
          const palette: Record<string, { bg: string; text: string }> = {
            amber: { bg: "bg-amber-500/10", text: "text-amber-700" },
            sky: { bg: "bg-sky-500/10", text: "text-sky-700" },
            emerald: { bg: "bg-emerald-500/10", text: "text-emerald-700" },
            rose: { bg: "bg-rose-500/10", text: "text-rose-700" },
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
                {c.count}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {c.amount > 0 ? formatINR(c.amount) : "—"}
              </p>
            </div>
          );
        })}
      </div>

      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Search networker, email, request id…"
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            options={PAYOUT_STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <Select
            options={WALLET_TYPE_OPTIONS}
            value={walletFilter}
            onChange={(e) => setWalletFilter(e.target.value)}
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
          <div className="md:col-span-6 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)]">
              <CalendarRange className="w-3.5 h-3.5" />
              Quick:
            </span>
            {[
              { l: "Today", n: 0 },
              { l: "7d", n: 7 },
              { l: "30d", n: 30 },
              { l: "90d", n: 90 },
            ].map((q) => (
              <button
                key={q.l}
                type="button"
                onClick={() => {
                  setDateFrom(daysAgoYmd(q.n));
                  setDateTo(todayYmd());
                }}
                className="px-2.5 py-1 rounded-full border border-[var(--border)] text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-slate-50 transition-colors"
              >
                {q.l}
              </button>
            ))}
            {hasActive && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Loading withdrawals…</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50/95">
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Request
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Networker
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Wallet
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      Requested
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      Approved
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {pageData.map((p) => (
                    <tr
                      key={p.payout_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="text-[12px] font-mono font-semibold text-[var(--text-primary)]">
                          {p.payout_id}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {formatDate(p.requested_at)}
                        </p>
                        {p.sc_tx_reference && (
                          <p className="text-[10px] font-mono text-emerald-700 mt-0.5 inline-flex items-center gap-1">
                            <ExternalLink className="w-2.5 h-2.5" />{" "}
                            {p.sc_tx_reference}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {p.user_name}
                        </p>
                        <p className="text-[11px] font-mono text-[var(--text-muted)]">
                          {p.sponsor_id}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {p.email}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                            p.wallet_type === "DIRECT"
                              ? "bg-indigo-500/10 text-indigo-700"
                              : "bg-sky-500/10 text-sky-700",
                          )}
                        >
                          <Wallet className="w-3 h-3" />
                          {p.wallet_type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums font-semibold text-[var(--text-primary)]">
                        {formatINR(p.requested_amount)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-[var(--text-secondary)]">
                        {p.approved_amount != null
                          ? formatINR(p.approved_amount)
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge status={p.status} />
                        {p.admin_note && (
                          <p className="text-[10px] text-[var(--text-muted)] mt-1 max-w-[14rem] truncate inline-flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />{" "}
                            {p.admin_note}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {p.status === "PENDING" ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="primary"
                              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              onClick={() => openApprove(p)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<XCircle className="w-3.5 h-3.5" />}
                              onClick={() => openReject(p)}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)]">
                            —
                          </span>
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
                        No withdrawal requests match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">
                Page {page} of {totalPages} · {filtered.length} requests
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((x) => Math.max(1, x - 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((x) => Math.min(totalPages, x + 1))}
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

      {actionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-[var(--border)]">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {actionModal.mode === "approve"
                  ? "Approve withdrawal"
                  : "Reject withdrawal"}{" "}
                — {actionModal.item.payout_id}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {actionModal.item.user_name} ·{" "}
                {formatINR(actionModal.item.requested_amount)} from{" "}
                {actionModal.item.wallet_type} wallet
              </p>
            </div>
            <div className="p-6 space-y-4">
              {actionError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-sm font-semibold text-rose-700">
                    {actionError}
                  </p>
                </div>
              )}
              {actionModal.mode === "approve" && (
                <>
                  <Input
                    label="Approved amount (₹)"
                    type="number"
                    step="0.01"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    hint="Defaults to requested amount. Backend debits wallet and processes via Secure Coin."
                  />
                </>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Admin note
                  {actionModal.mode === "reject" && (
                    <span className="text-[var(--danger-500)] ml-0.5">*</span>
                  )}
                </label>
                <textarea
                  className="w-full min-h-[88px] px-4 py-3 rounded-[10px] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/20 focus:border-[var(--primary-500)]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    actionModal.mode === "approve"
                      ? "Optional note for audit trail"
                      : "Reason for rejection (shown to networker)"
                  }
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={closeModal} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant={actionModal.mode === "approve" ? "primary" : "danger"}
                onClick={submitAction}
                loading={actionLoading}
                disabled={actionModal.mode === "reject" && !note.trim()}
                icon={
                  actionModal.mode === "approve" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )
                }
              >
                {actionModal.mode === "approve"
                  ? "Approve withdrawal"
                  : "Reject withdrawal"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
