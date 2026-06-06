"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users as UsersIcon,
  FileCheck2,
  Wallet,
  Loader2,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { ActionModal } from "@/components/modals/action-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn, formatINR, formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import {
  adjustUserWallet,
  getUser,
  getUserWalletLedger,
  getUserWallets,
  updateUserStatus,
  type AdminUserRow,
  type AdminUserWalletSummary,
  type ApiLedgerEntry,
} from "@/lib/admin-api";
import type { NetworkerRow } from "@/lib/admin-networkers";

const MANAGE_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "BLOCKED", label: "Blocked" },
];

const ADJUST_WALLET_OPTIONS = [
  { value: "DIRECT", label: "Direct wallet" },
  { value: "TEAM", label: "Team wallet" },
];

const ADJUST_ENTRY_OPTIONS = [
  { value: "CREDIT", label: "Credit (+)" },
  { value: "DEBIT", label: "Debit (−)" },
];

const LEDGER_PAGE_SIZE = 8;

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

function sourceLabel(s: string) {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}

function parseRupeesToPaise(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

type TabId = "overview" | "ledger";

interface NetworkerDetailModalProps {
  initial: NetworkerRow;
  onClose: () => void;
  onUpdated: () => void;
}

export function NetworkerDetailModal({
  initial,
  onClose,
  onUpdated,
}: NetworkerDetailModalProps) {
  const router = useRouter();
  const userId = initial.user_id;

  const [tab, setTab] = useState<TabId>("overview");
  const [profile, setProfile] = useState<AdminUserRow | null>(null);
  const [wallets, setWallets] = useState<AdminUserWalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [statusValue, setStatusValue] = useState(initial.status);
  const [statusNote, setStatusNote] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  const [adjustWallet, setAdjustWallet] = useState<"DIRECT" | "TEAM">("DIRECT");
  const [adjustEntry, setAdjustEntry] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [ledgerWallet, setLedgerWallet] = useState<"DIRECT" | "TEAM">("DIRECT");
  const [ledgerRows, setLedgerRows] = useState<ApiLedgerEntry[]>([]);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const loadCore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [user, walletSummary] = await Promise.all([
        getUser(userId),
        getUserWallets(userId),
      ]);
      setProfile(user);
      setWallets(walletSummary);
      setStatusValue(user.status);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load networker";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const res = await getUserWalletLedger({
        userId,
        walletType: ledgerWallet,
        page: ledgerPage,
        limit: LEDGER_PAGE_SIZE,
      });
      setLedgerRows(res.data);
      setLedgerTotalPages(res.totalPages);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load ledger";
      setError(msg);
      setLedgerRows([]);
    } finally {
      setLedgerLoading(false);
    }
  }, [userId, ledgerWallet, ledgerPage]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (tab === "ledger") void loadLedger();
  }, [tab, loadLedger]);

  useEffect(() => {
    setLedgerPage(1);
  }, [ledgerWallet]);

  const displayName = profile?.full_name ?? initial.full_name;
  const dailyPct =
    (profile?.daily_binary_cap ?? initial.daily_binary_cap) > 0
      ? ((profile?.today_binary_earned ?? initial.today_binary_earned) /
          (profile?.daily_binary_cap ?? initial.daily_binary_cap)) *
        100
      : 0;

  const handleStatusSave = async () => {
    if (statusValue === profile?.status) return;
    if (
      statusValue === "BLOCKED" &&
      !window.confirm(
        `Block ${displayName}? They will not be able to sign in.`,
      )
    ) {
      return;
    }
    setStatusSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateUserStatus(userId, {
        status: statusValue as "ACTIVE" | "INACTIVE" | "BLOCKED",
        admin_note: statusNote.trim() || undefined,
      });
      setProfile(updated);
      setStatusValue(updated.status);
      setStatusNote("");
      setSuccess(`Status updated to ${updated.status}.`);
      onUpdated();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to update status",
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = parseRupeesToPaise(adjustAmount);
    if (!paise) {
      setError("Enter a valid amount in rupees.");
      return;
    }
    if (!adjustReason.trim()) {
      setError("Reason is required for wallet adjustments.");
      return;
    }
    if (
      adjustEntry === "DEBIT" &&
      !window.confirm(
        `Debit ${formatINR(paise)} from ${adjustWallet} wallet for ${displayName}?`,
      )
    ) {
      return;
    }
    setAdjustSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await adjustUserWallet(userId, {
        wallet_type: adjustWallet,
        entry_type: adjustEntry,
        amount: paise,
        reason: adjustReason.trim(),
        admin_note: adjustNote.trim() || undefined,
      });
      setWallets({
        user_id: result.user_id,
        sponsor_id: wallets?.sponsor_id ?? initial.sponsor_id,
        direct_balance: result.direct_balance,
        team_balance: result.team_balance,
        total_balance: result.total_balance,
      });
      setAdjustAmount("");
      setAdjustReason("");
      setAdjustNote("");
      setSuccess(
        `${adjustEntry === "CREDIT" ? "Credited" : "Debited"} ${formatINR(result.amount)} to ${result.wallet_type} wallet.`,
      );
      if (tab === "ledger" && ledgerWallet === adjustWallet) {
        setLedgerPage(1);
        void loadLedger();
      }
      onUpdated();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Wallet adjustment failed",
      );
    } finally {
      setAdjustSaving(false);
    }
  };

  const walletHeader = wallets ? (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] sm:text-xs font-semibold text-emerald-800 whitespace-nowrap">
        D {formatINR(wallets.direct_balance)}
      </span>
      <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] sm:text-xs font-semibold text-indigo-800 whitespace-nowrap">
        T {formatINR(wallets.team_balance)}
      </span>
    </div>
  ) : null;

  return (
    <ActionModal
      title={displayName}
      onClose={onClose}
      maxWidth="max-w-3xl"
      titleIcon={<UsersIcon className="w-5 h-5" />}
      headerTrailing={walletHeader}
    >
      <div className="flex gap-1 p-1 mb-5 rounded-xl bg-slate-100/80 border border-slate-200/80">
        {(
          [
            { id: "overview" as const, label: "Overview & manage" },
            { id: "ledger" as const, label: "Wallet ledger" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors",
              tab === t.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading networker…</span>
        </div>
      ) : tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <div>
              <DetailRow
                label="Sponsor ID"
                value={profile?.sponsor_id ?? initial.sponsor_id}
                mono
              />
              <DetailRow label="Email" value={profile?.email ?? initial.email} />
              <DetailRow
                label="Phone"
                value={profile?.phone ?? initial.phone ?? "—"}
              />
              <DetailRow
                label="Status"
                value={<Badge status={profile?.status ?? initial.status} />}
              />
              <DetailRow
                label="Placement"
                value={
                  <Badge
                    status={profile?.placement_status ?? initial.placement_status}
                  />
                }
              />
              <DetailRow
                label="Joined"
                value={formatDate(
                  profile?.created_at ?? initial.created_at,
                  false,
                )}
              />
            </div>
            <div>
              <DetailRow
                label="Package"
                value={
                  initial.package_name
                    ? `${initial.package_name}${initial.package_amount ? ` · ${formatINR(initial.package_amount)}` : ""}`
                    : "—"
                }
              />
              <DetailRow
                label="Monthly income"
                value={formatINR(
                  profile?.monthly_income_paise ?? initial.monthly_income_paise,
                )}
              />
              <DetailRow
                label="Monthly shopping"
                value={formatINR(
                  profile?.monthly_shopping_paise ??
                    initial.monthly_shopping_paise,
                )}
              />
              <DetailRow
                label="Binary earned today"
                value={formatINR(
                  profile?.today_binary_earned ?? initial.today_binary_earned,
                )}
              />
              <DetailRow
                label="Daily binary cap"
                value={formatINR(
                  profile?.daily_binary_cap ?? initial.daily_binary_cap,
                )}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-3 sm:px-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Today&apos;s binary cap usage
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                {formatINR(profile?.today_binary_earned ?? initial.today_binary_earned)}{" "}
                / {formatINR(profile?.daily_binary_cap ?? initial.daily_binary_cap)}{" "}
                ({dailyPct.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${Math.min(100, dailyPct)}%` }}
              />
            </div>
          </div>

          {wallets && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    label: "Direct wallet",
                    value: wallets.direct_balance,
                    tone: "emerald",
                  },
                  {
                    label: "Team wallet",
                    value: wallets.team_balance,
                    tone: "indigo",
                  },
                  {
                    label: "Total balance",
                    value: wallets.total_balance,
                    tone: "slate",
                  },
                ] as const
              ).map((w) => (
                <div
                  key={w.label}
                  className={cn(
                    "rounded-xl border px-3.5 py-3",
                    w.tone === "emerald" && "border-emerald-100 bg-emerald-50/50",
                    w.tone === "indigo" && "border-indigo-100 bg-indigo-50/50",
                    w.tone === "slate" && "border-slate-200 bg-slate-50/80",
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {w.label}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-slate-900 mt-1">
                    {formatINR(w.value)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Account status</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Status"
                options={MANAGE_STATUS_OPTIONS}
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value)}
              />
              <Input
                label="Admin note (optional)"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Reason for status change…"
                maxLength={500}
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={
                  statusSaving ||
                  statusValue === (profile?.status ?? initial.status)
                }
                loading={statusSaving}
                onClick={() => void handleStatusSave()}
              >
                Update status
              </Button>
            </div>
          </div>

          <form
            onSubmit={(e) => void handleAdjust(e)}
            className="rounded-xl border border-violet-200/80 bg-violet-50/30 p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-violet-700" />
              <p className="text-sm font-semibold text-slate-800">
                Adjust wallet
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Wallet"
                options={ADJUST_WALLET_OPTIONS}
                value={adjustWallet}
                onChange={(e) =>
                  setAdjustWallet(e.target.value as "DIRECT" | "TEAM")
                }
              />
              <Select
                label="Entry type"
                options={ADJUST_ENTRY_OPTIONS}
                value={adjustEntry}
                onChange={(e) =>
                  setAdjustEntry(e.target.value as "CREDIT" | "DEBIT")
                }
              />
              <Input
                label="Amount (₹)"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 100.00"
                hint="Entered in rupees; stored as paise on the ledger."
              />
              <Input
                label="Reason"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Visible on ledger row"
                maxLength={500}
              />
            </div>
            <Input
              label="Admin note (optional)"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              placeholder="Internal audit note"
              maxLength={500}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                loading={adjustSaving}
                disabled={adjustSaving}
              >
                Apply adjustment
              </Button>
            </div>
          </form>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<FileCheck2 className="w-4 h-4" />}
              onClick={() => {
                const q = new URLSearchParams();
                q.set("user", userId);
                router.push(`/kyc-requests?${q.toString()}`);
                onClose();
              }}
            >
              View KYC
            </Button>
            <p className="text-[11px] text-slate-500 leading-snug sm:text-right">
              Opens KYC requests filtered for this networker.
            </p>
          </div>

          {(profile?.secure_wallet_external_id ??
            initial.secure_wallet_external_id) && (
            <div className="rounded-xl border border-violet-100 bg-gradient-to-b from-violet-50/40 to-white px-3 py-3">
              <p className="text-xs font-semibold text-slate-900 mb-2">
                Secure Coin wallet
              </p>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-sm">
                <span className="font-mono text-slate-700 break-all">
                  {profile?.secure_wallet_external_id ??
                    initial.secure_wallet_external_id}
                </span>
                <span className="font-bold tabular-nums text-violet-900">
                  {formatINR(
                    profile?.secure_wallet_balance_paise ??
                      initial.secure_wallet_balance_paise ??
                      0,
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              label="Wallet"
              options={ADJUST_WALLET_OPTIONS}
              value={ledgerWallet}
              onChange={(e) =>
                setLedgerWallet(e.target.value as "DIRECT" | "TEAM")
              }
              className="max-w-[200px]"
            />
            {wallets && (
              <p className="text-sm text-slate-600 sm:ml-auto tabular-nums">
                Balance:{" "}
                <span className="font-semibold text-slate-900">
                  {formatINR(
                    ledgerWallet === "DIRECT"
                      ? wallets.direct_balance
                      : wallets.team_balance,
                  )}
                </span>
              </p>
            )}
          </div>

          {ledgerLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading ledger…</span>
            </div>
          ) : ledgerRows.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">
              No ledger entries for this wallet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/90">
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Date
                    </th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Source
                    </th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Description
                    </th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerRows.map((row) => {
                    const credit = row.entry_type === "CREDIT";
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-medium text-slate-700">
                            {sourceLabel(row.source)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[180px] truncate">
                          {row.description ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
                              credit ? "text-emerald-700" : "text-rose-700",
                            )}
                          >
                            {credit ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {credit ? "+" : "−"}
                            {formatINR(Math.abs(row.amount))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page {ledgerPage} of {ledgerTotalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={ledgerPage <= 1 || ledgerLoading}
                onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={ledgerPage >= ledgerTotalPages || ledgerLoading}
                onClick={() =>
                  setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))
                }
                icon={<ChevronRight className="w-3.5 h-3.5" />}
                iconPosition="right"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </ActionModal>
  );
}
