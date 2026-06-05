"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users as UsersIcon,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck2,
  Wallet,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionModal } from "@/components/modals/action-modal";
import { PAGE_SIZE, USER_STATUS_OPTIONS } from "@/lib/constants";
import { cn, formatINR, formatDate } from "@/lib/utils";
import {
  fetchAllNetworkers,
  fetchNetworkerPage,
  filterNetworkers,
  type NetworkerRow,
} from "@/lib/admin-networkers";
import { listPackages } from "@/lib/admin-api";
import { ApiError } from "@/lib/api-client";

function DetailRow({
  label,
  value,
  mono,
}: {
  label: React.ReactNode;
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

function UserDetail({
  user,
  onClose,
}: {
  user: NetworkerRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const dailyPct =
    user.daily_binary_cap > 0
      ? (user.today_binary_earned / user.daily_binary_cap) * 100
      : 0;

  const Bar = ({ pct, color }: { pct: number; color: string }) => (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div
        className={cn("h-full rounded-full", color)}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );

  return (
    <ActionModal
      title={user.full_name}
      onClose={onClose}
      maxWidth="max-w-2xl"
      titleIcon={<UsersIcon className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
        <div>
          <DetailRow label="Sponsor ID" value={user.sponsor_id} mono />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Phone" value={user.phone ?? "—"} />
          <DetailRow label="Status" value={<Badge status={user.status} />} />
          <DetailRow
            label="Placement"
            value={<Badge status={user.placement_status} />}
          />
          <DetailRow
            label="Joined"
            value={formatDate(user.created_at, false)}
          />
        </div>
        <div>
          <DetailRow
            label="Package"
            value={`${user.package_name ?? "—"} · ${user.package_amount ? formatINR(user.package_amount) : "—"}`}
          />
          <DetailRow
            label="Monthly income"
            value={formatINR(user.monthly_income_paise)}
          />
          <DetailRow
            label="Monthly shopping"
            value={formatINR(user.monthly_shopping_paise)}
          />
          <DetailRow
            label="Binary earned today"
            value={formatINR(user.today_binary_earned)}
          />
          <DetailRow
            label="Daily binary cap"
            value={formatINR(user.daily_binary_cap)}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3">
        <Button
          variant="secondary"
          size="sm"
          icon={<FileCheck2 className="w-4 h-4" />}
          onClick={() => {
            const q = new URLSearchParams();
            q.set("user", user.user_id);
            router.push(`/kyc-requests?${q.toString()}`);
            onClose();
          }}
        >
          View KYC
        </Button>
        <p className="text-[11px] text-slate-500 leading-snug sm:text-right sm:max-w-[70%]">
          Opens KYC requests filtered for this networker.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200/90 bg-white px-3 py-3 sm:px-4 sm:py-3 shadow-sm ring-1 ring-violet-500/[0.06]">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 shrink-0">
            <Wallet className="w-3.5 h-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 leading-tight">
              Secure Coin wallet
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
              Linked platform wallet
            </p>
          </div>
        </div>
        {user.secure_wallet_external_id ? (
          <div className="rounded-lg border border-violet-100 bg-gradient-to-b from-violet-50/40 to-white px-3 py-2.5 flex flex-col sm:flex-row sm:items-stretch sm:divide-x sm:divide-violet-100 gap-3 sm:gap-0 sm:py-0">
            <div className="flex-1 min-w-0 sm:px-3 sm:py-2.5 flex flex-col justify-center">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Wallet ID
              </span>
              <p className="text-xs font-mono font-medium text-slate-900 mt-1 break-all leading-snug">
                {user.secure_wallet_external_id}
              </p>
            </div>
            <div className="shrink-0 sm:w-[42%] sm:px-3 sm:py-2.5 flex flex-col justify-center sm:items-end border-t border-violet-100 pt-2 sm:border-t-0 sm:pt-0">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:text-right">
                Balance
              </span>
              <p className="text-lg font-bold tabular-nums text-violet-900 mt-0.5 sm:text-right leading-none">
                {formatINR(user.secure_wallet_balance_paise ?? 0)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-8">
            <p className="text-xs text-slate-500">Not linked</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Today&apos;s binary cap usage
          </span>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {formatINR(user.today_binary_earned)} / {formatINR(user.daily_binary_cap)}{" "}
            ({dailyPct.toFixed(1)}%)
          </span>
        </div>
        <Bar pct={dailyPct} color="bg-amber-500" />
      </div>
    </ActionModal>
  );
}

export default function UsersPage() {
  const [rows, setRows] = useState<NetworkerRow[]>([]);
  const [totalListed, setTotalListed] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [clientMode, setClientMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [packageFilter, setPackageFilter] = useState("");
  const [page, setPage] = useState(1);
  const [packageOptions, setPackageOptions] = useState<
    { value: string; label: string }[]
  >([{ value: "", label: "All packages" }]);

  const [detail, setDetail] = useState<NetworkerRow | null>(null);

  const loadPackages = useCallback(async () => {
    try {
      const packages = await listPackages();
      setPackageOptions([
        { value: "", label: "All packages" },
        ...packages.map((p) => ({
          value: p.name,
          label: `${p.name} · ${formatINR(p.amount)}`,
        })),
      ]);
    } catch {
      /* package filter optional */
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const useClient = !!search.trim() || !!packageFilter;
    try {
      if (useClient) {
        const all = await fetchAllNetworkers(statusFilter || undefined);
        setRows(all);
        setClientMode(true);
        setTotalListed(all.length);
      } else {
        const res = await fetchNetworkerPage({
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
            : "Failed to load networkers";
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, packageFilter]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(
    () =>
      clientMode ? filterNetworkers(rows, search, packageFilter) : rows,
    [clientMode, rows, search, packageFilter],
  );

  const totalPages = clientMode
    ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    : serverTotalPages;

  const pageData = clientMode
    ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : filtered;

  const hasActive = !!search.trim() || !!statusFilter || !!packageFilter;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPackageFilter("");
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, packageFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const showingCount = clientMode ? filtered.length : pageData.length;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md text-white">
            <UsersIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Networkers
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Browse and inspect MLM networker accounts from the admin API.
            </p>
          </div>
        </div>
        <div className="text-xs text-[var(--text-muted)] tabular-nums">
          {clientMode ? (
            <>
              Showing{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {showingCount}
              </span>{" "}
              networkers
            </>
          ) : (
            <>
              Page {page} ·{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {showingCount}
              </span>{" "}
              on this page ({totalListed} accounts in filter)
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Search name, email, SPF code, phone…"
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            options={USER_STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <Select
            options={packageOptions}
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
          />
        </div>
        {hasActive && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Loading networkers…</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50/95">
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Networker
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      SPF Code
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Package
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      Monthly income
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      Binary today
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {pageData.map((u) => (
                    <tr
                      key={u.user_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {u.full_name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-mono text-[var(--text-primary)]">
                        {u.sponsor_id}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                        {u.package_name ?? "—"}
                        <span className="block text-[11px] text-[var(--text-muted)]">
                          {u.package_amount ? formatINR(u.package_amount) : ""}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge status={u.status} />
                        {u.placement_status === "PENDING_PLACEMENT" && (
                          <span className="block mt-1">
                            <Badge status="PENDING_PLACEMENT" />
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {formatINR(u.monthly_income_paise)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {formatINR(u.today_binary_earned)}
                        </span>
                        <span className="block text-[11px] text-[var(--text-muted)]">
                          cap {formatINR(u.daily_binary_cap)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setDetail(u)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {pageData.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-16 text-center text-sm text-[var(--text-muted)]"
                      >
                        No networkers match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages || loading}
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

      {detail && <UserDetail user={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
