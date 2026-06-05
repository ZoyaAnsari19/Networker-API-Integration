"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Landmark,
  Search,
  ShieldCheck,
  X,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ActionModal } from "@/components/modals/action-modal";
import { PAGE_SIZE } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import {
  KYC_DOCUMENT_LABELS,
  fetchAllKyc,
  fetchKycDetail,
  fetchKycPage,
  fetchKycStatusCounts,
  filterKycRows,
  type KycRow,
  type KycStatus,
} from "@/lib/admin-kyc";
import { updateKycRequest } from "@/lib/admin-api";
import { ApiError } from "@/lib/api-client";

function KycStatusChip({ status }: { status: KycStatus }) {
  const map = {
    PENDING: {
      Icon: Clock,
      bg: "bg-slate-100",
      color: "text-slate-700",
      label: "Pending",
    },
    SUBMITTED: {
      Icon: Clock,
      bg: "bg-amber-50",
      color: "text-amber-800",
      label: "Submitted",
    },
    APPROVED: {
      Icon: CheckCircle2,
      bg: "bg-emerald-50",
      color: "text-emerald-700",
      label: "Approved",
    },
    REJECTED: {
      Icon: XCircle,
      bg: "bg-rose-50",
      color: "text-rose-700",
      label: "Rejected",
    },
  } as const;
  const cfg = map[status];
  const Icon = cfg.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold",
        cfg.bg,
        cfg.color,
      )}
    >
      <Icon className="h-3.5 w-3.5 opacity-90 shrink-0" />
      {cfg.label}
    </span>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span
        className={cn(
          "text-sm text-right text-slate-900 font-medium",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default function KycRequestsPage() {
  const [rows, setRows] = useState<KycRow[]>([]);
  const [totalListed, setTotalListed] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [clientMode, setClientMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | KycStatus>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<KycRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [deepLinkReady, setDeepLinkReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const userParam = sp.get("user");
    const openId = sp.get("open");
    if (userParam) setSearch(userParam);
    if (openId) setDetailId(openId);
    setDeepLinkReady(true);
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const c = await fetchKycStatusCounts();
      setCounts(c);
    } catch {
      /* optional header stats */
    }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const needsClient = !!search.trim() || !!dateFrom || !!dateTo;

    try {
      if (needsClient) {
        const all = await fetchAllKyc(statusFilter || undefined);
        setRows(all);
        setClientMode(true);
        setTotalListed(all.length);
      } else {
        const res = await fetchKycPage({
          status: statusFilter || undefined,
          page,
          limit: PAGE_SIZE,
        });
        setRows(res.rows);
        setClientMode(false);
        setTotalListed(res.total);
        setServerTotalPages(res.totalPages);
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load KYC requests";
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    if (!deepLinkReady) return;
    loadCounts();
  }, [deepLinkReady, loadCounts]);

  useEffect(() => {
    if (!deepLinkReady) return;
    loadRows();
  }, [deepLinkReady, loadRows]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setActionError(null);
      try {
        const d = await fetchKycDetail(detailId);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load KYC detail";
          setActionError(msg);
          setDetail(null);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  const filtered = useMemo(
    () =>
      clientMode
        ? filterKycRows(rows, search, statusFilter, dateFrom, dateTo)
        : rows,
    [clientMode, rows, search, statusFilter, dateFrom, dateTo],
  );

  const totalPages = clientMode
    ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    : serverTotalPages;

  const pageData = clientMode
    ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : filtered;

  const hasActive = !!search.trim() || !!statusFilter || !!dateFrom || !!dateTo;
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const refreshAfterAction = useCallback(async () => {
    await Promise.all([loadRows(), loadCounts()]);
    if (detailId) {
      const d = await fetchKycDetail(detailId);
      setDetail(d);
    }
  }, [loadRows, loadCounts, detailId]);

  const approve = useCallback(
    async (id: string) => {
      setActionLoading(true);
      setActionError(null);
      try {
        await updateKycRequest(id, { status: "APPROVED" });
        setRejectMode(false);
        setRejectReason("");
        await refreshAfterAction();
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Approve failed";
        setActionError(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [refreshAfterAction],
  );

  const reject = useCallback(
    async (id: string, reason: string) => {
      setActionLoading(true);
      setActionError(null);
      try {
        await updateKycRequest(id, {
          status: "REJECTED",
          rejection_reason: reason,
        });
        setRejectMode(false);
        setRejectReason("");
        await refreshAfterAction();
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Reject failed";
        setActionError(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [refreshAfterAction],
  );

  const openDetail = (r: KycRow) => {
    setDetailId(r.kyc_id);
    setRejectMode(false);
    setRejectReason("");
    setActionError(null);
  };

  const closeDetail = () => {
    setDetailId(null);
    setRejectMode(false);
    setRejectReason("");
    setActionError(null);
  };

  const canAct = detail?.status === "SUBMITTED";

  return (
    <div className="space-y-6 pb-8">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-indigo-500/[0.07] via-white to-slate-50/80 shadow-[var(--shadow-sm)] px-5 py-5 sm:px-7 sm:py-6">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-400/15 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3 min-w-0">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                KYC requests
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5 max-w-2xl">
                Review networker identity documents. Approve or reject submitted
                requests — rejection reasons are shown to the networker.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-[11px] font-semibold">
              <Clock className="w-3 h-3" />
              {counts.pending} awaiting review
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-[11px] font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              {counts.approved} approved
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 text-rose-800 px-3 py-1 text-[11px] font-semibold">
              <XCircle className="w-3 h-3" />
              {counts.rejected} rejected
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      <Card padding="lg" className="border-slate-200/90 shadow-sm shadow-slate-200/40">
        <div className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              All submissions
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {clientMode ? (
                <>
                  Showing{" "}
                  <span className="font-semibold text-[var(--text-secondary)]">
                    {filtered.length}
                  </span>{" "}
                  matching
                </>
              ) : (
                <>
                  Page {page} ·{" "}
                  <span className="font-semibold text-[var(--text-secondary)]">
                    {totalListed}
                  </span>{" "}
                  total in API filter
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-4">
              <Input
                name="kyc-search"
                placeholder="Search networker, SPF, email, KYC id…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="lg:col-span-3">
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "" | KycStatus)
                }
                options={[
                  { value: "", label: "All statuses" },
                  { value: "PENDING", label: "Pending" },
                  { value: "SUBMITTED", label: "Submitted" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "REJECTED", label: "Rejected" },
                ]}
              />
            </div>
            <div className="lg:col-span-2">
              <Input
                type="date"
                label="From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="lg:col-span-2">
              <Input
                type="date"
                label="To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="lg:col-span-1 flex items-end">
              {hasActive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={<X className="w-3.5 h-3.5" />}
                  onClick={clearFilters}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {hasActive && (
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5" />
              Date filter uses the submitted/reviewed date.
            </span>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading KYC requests…</span>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/30">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-white">
                      <th className="px-5 py-3.5 text-xs font-medium text-slate-500">
                        KYC
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium text-slate-500">
                        Networker
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium text-slate-500">
                        Submitted
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-medium text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-16 text-center text-sm text-slate-500 bg-white"
                        >
                          No KYC submissions match your filters.
                        </td>
                      </tr>
                    ) : (
                      pageData.map((r) => (
                        <tr
                          key={r.kyc_id}
                          onClick={() => openDetail(r)}
                          className="border-b border-slate-100/90 bg-white transition-colors last:border-0 hover:bg-slate-50/80 cursor-pointer"
                        >
                          <td className="align-middle px-5 py-4">
                            <span className="font-mono text-xs font-semibold text-slate-800">
                              {r.kyc_id}
                            </span>
                            <span className="block text-[11px] text-slate-400">
                              {r.reviewed_at
                                ? `reviewed ${formatDate(r.reviewed_at, false)}`
                                : "—"}
                            </span>
                          </td>
                          <td className="align-middle px-5 py-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {r.full_name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              <span className="font-mono mr-2">{r.sponsor_id}</span>
                              {r.email}
                            </p>
                          </td>
                          <td className="align-middle px-5 py-4 text-sm text-slate-600">
                            {r.submitted_at ? (
                              formatDate(r.submitted_at, false)
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="align-middle px-5 py-4">
                            <KycStatusChip status={r.status} />
                          </td>
                          <td
                            className="align-middle px-5 py-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => openDetail(r)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800 inline-flex items-center gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {clientMode
                  ? `${filtered.length} result(s)`
                  : `Page ${page} of ${totalPages}`}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  className="h-9 gap-1 rounded-lg px-3 text-xs font-medium"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="px-2 text-xs font-medium text-slate-600">
                  Page {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  type="button"
                  className="h-9 gap-1 rounded-lg px-3 text-xs font-medium"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {detailId && (
        <ActionModal
          title={detail ? `KYC · ${detail.kyc_id}` : "KYC request"}
          onClose={closeDetail}
          maxWidth="max-w-2xl"
          titleIcon={<ShieldCheck className="h-5 w-5 text-indigo-600" />}
          footer={
            detailLoading ? null : canAct ? (
              rejectMode ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-slate-500">
                    Reason will be visible to the networker on their KYC page.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={actionLoading}
                      onClick={() => {
                        setRejectMode(false);
                        setRejectReason("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500 shadow-sm"
                      icon={<XCircle className="h-4 w-4" />}
                      loading={actionLoading}
                      onClick={() => {
                        if (!detail) return;
                        reject(detail.kyc_id, rejectReason.trim());
                      }}
                      disabled={!rejectReason.trim()}
                    >
                      Confirm reject
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeDetail}
                    disabled={actionLoading}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    className="bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500 shadow-sm"
                    icon={<XCircle className="h-4 w-4" />}
                    disabled={actionLoading}
                    onClick={() => setRejectMode(true)}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    className="bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-sm"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    loading={actionLoading}
                    onClick={() => detail && approve(detail.kyc_id)}
                  >
                    Approve
                  </Button>
                </div>
              )
            ) : (
              <div className="flex justify-end">
                <Button type="button" variant="secondary" onClick={closeDetail}>
                  Close
                </Button>
              </div>
            )
          }
        >
          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading details…</span>
            </div>
          ) : detail ? (
            <div className="space-y-5">
              {actionError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-sm font-semibold text-rose-700">
                    {actionError}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <KycStatusChip status={detail.status} />
                <span className="text-xs text-slate-500">
                  Submitted{" "}
                  {detail.submitted_at ? formatDate(detail.submitted_at) : "—"}
                </span>
                {detail.reviewed_at && (
                  <span className="text-xs text-slate-500">
                    · Reviewed {formatDate(detail.reviewed_at)}
                  </span>
                )}
              </div>

              {detail.status === "PENDING" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  This request is still pending upload/submit. Only{" "}
                  <span className="font-semibold">SUBMITTED</span> requests can
                  be approved or rejected via the API.
                </div>
              )}

              {detail.rejection_reason && detail.status === "REJECTED" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-rose-900">
                      Last rejection reason
                    </p>
                    <p className="text-xs text-rose-800 mt-0.5">
                      {detail.rejection_reason}
                    </p>
                  </div>
                </div>
              )}

              {rejectMode && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-2">
                  <label className="text-xs font-semibold text-rose-900 uppercase tracking-wide">
                    Rejection reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    className="w-full min-h-[90px] px-3 py-2.5 rounded-[10px] border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. ‘Aadhaar back photo is blurred, please re-upload a clearer scan.’"
                    autoFocus
                  />
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-200 bg-white">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Networker
                  </p>
                </div>
                <div className="px-4">
                  <InfoRow label="Full name" value={detail.full_name} />
                  <InfoRow label="Sponsor ID" value={detail.sponsor_id} mono />
                  <InfoRow label="Email" value={detail.email} />
                  <InfoRow label="Phone" value={detail.phone ?? "—"} />
                  <InfoRow label="User ID" value={detail.user_id} mono />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                  <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </span>
                  <h4 className="text-sm font-semibold text-slate-800">
                    KYC documents
                  </h4>
                  <span className="ml-auto text-[11px] text-slate-500">
                    {detail.documents.length} file
                    {detail.documents.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="p-4">
                  {detail.documents.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">
                      No documents uploaded yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {detail.documents.map((d) => (
                        <a
                          key={d.document_id}
                          href={d.document_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "group rounded-lg border border-slate-200 overflow-hidden bg-slate-50 hover:border-indigo-300 hover:shadow-md transition-all",
                            !d.document_url && "pointer-events-none opacity-60",
                          )}
                        >
                          {d.document_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={d.document_url}
                              alt={d.document_type}
                              className="w-full h-28 object-cover"
                            />
                          ) : (
                            <div className="w-full h-28 flex items-center justify-center text-xs text-slate-400">
                              No preview URL
                            </div>
                          )}
                          <div className="px-2.5 py-1.5 border-t border-slate-100 bg-white">
                            <p className="text-[11px] font-semibold text-slate-700 truncate">
                              {KYC_DOCUMENT_LABELS[d.document_type] ??
                                d.document_type}
                            </p>
                            <p className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              {d.mime_type ?? "file"}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                  <span className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                    <Landmark className="w-4 h-4 text-sky-600" />
                  </span>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Bank information
                  </h4>
                </div>
                <div className="p-4">
                  <p className="text-sm text-slate-500 text-center py-4">
                    Bank details are not included in the admin KYC API response.
                    Check the bank passbook document if uploaded.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-8 text-center">
              Could not load this KYC request.
            </p>
          )}
        </ActionModal>
      )}
    </div>
  );
}
