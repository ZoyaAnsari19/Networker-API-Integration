"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users as UsersIcon,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NetworkerDetailModal } from "@/components/networkers/networker-detail-modal";
import { PAGE_SIZE, USER_STATUS_OPTIONS } from "@/lib/constants";
import { formatINR } from "@/lib/utils";
import {
  fetchAllNetworkers,
  fetchNetworkerPage,
  filterNetworkers,
  type NetworkerRow,
} from "@/lib/admin-networkers";
import { listPackages } from "@/lib/admin-api";
import { ApiError } from "@/lib/api-client";

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

      {detail && (
        <NetworkerDetailModal
          initial={detail}
          onClose={() => setDetail(null)}
          onUpdated={() => void loadUsers()}
        />
      )}
    </div>
  );
}
