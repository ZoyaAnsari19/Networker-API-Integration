"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users as UsersIcon,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Minus,
  Wallet,
  History,
  CheckCircle2,
  FileCheck2,
  GitBranch,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionModal } from "@/components/modals/action-modal";
import {
  USERS_INITIAL,
  PACKAGES_INITIAL,
  KYC_REQUESTS_INITIAL,
  type User,
} from "@/lib/mock-data";
import {
  PAGE_SIZE,
  USER_STATUS_OPTIONS,
} from "@/lib/constants";
import { cn, formatINR, formatDate } from "@/lib/utils";

type AdjustmentLog = {
  id: number;
  user_id: string;
  wallet: "DIRECT" | "TEAM";
  entry_type: "CREDIT" | "DEBIT";
  amount: number;
  note: string;
  created_at: string;
};

function UserDetail({ user, onClose }: { user: User; onClose: () => void }) {
  const router = useRouter();
  const kycRow = useMemo(
    () => KYC_REQUESTS_INITIAL.find((k) => k.user_id === user.user_id),
    [user.user_id],
  );
  const directPct = user.max_direct_cap > 0 ? (user.total_direct_earned / user.max_direct_cap) * 100 : 0;
  const binaryPct = user.max_binary_cap > 0 ? (user.total_binary_earned / user.max_binary_cap) * 100 : 0;
  const dailyPct = user.daily_binary_cap > 0 ? (user.today_binary_earned / user.daily_binary_cap) * 100 : 0;

  const Row = ({ label, value, mono }: { label: React.ReactNode; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className={cn("text-sm text-right text-slate-900 font-medium", mono && "font-mono")}>{value}</span>
    </div>
  );

  const Bar = ({ pct, color }: { pct: number; color: string }) => (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );

  return (
    <ActionModal title={user.full_name} onClose={onClose} maxWidth="max-w-2xl" titleIcon={<UsersIcon className="w-5 h-5" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
        <div>
          <Row label="Sponsor ID" value={user.sponsor_id} mono />
          <Row label="Upline" value={user.sponsor_code_of ? <span className="font-mono">{user.sponsor_code_of}</span> : "—"} />
          <Row label="Email" value={user.email} />
          <Row label="Phone" value={user.phone ?? "—"} />
          <Row label="Status" value={<Badge status={user.status} />} />
          <Row label="Placement" value={<Badge status={user.placement_status} />} />
          <Row label="Joined" value={formatDate(user.created_at, false)} />
        </div>
        <div>
          <Row label="Package" value={`${user.package_name ?? "—"} · ${user.package_amount ? formatINR(user.package_amount) : "—"}`} />
          <Row label="Direct balance" value={formatINR(user.direct_balance)} />
          <Row label="Team balance" value={formatINR(user.team_balance)} />
          <Row label="Total direct earned" value={formatINR(user.total_direct_earned)} />
          <Row label="Total binary earned" value={formatINR(user.total_binary_earned)} />
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
            if (kycRow) q.set("open", kycRow.kyc_id);
            router.push(`/kyc-requests?${q.toString()}`);
            onClose();
          }}
        >
          View KYC
        </Button>
        <p className="text-[11px] text-slate-500 leading-snug sm:text-right sm:max-w-[70%]">
          {kycRow ? (
            <>
              Request <span className="font-mono text-slate-700">{kycRow.kyc_id}</span> · opens on KYC Requests
            </>
          ) : (
            <>No submitted request yet — opens filtered list for this user.</>
          )}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
        <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-3 sm:px-4 sm:py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
              <GitBranch className="w-3.5 h-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 leading-tight">Unmatched BV carried forward</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Binary tree · per leg</p>
            </div>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50/40 overflow-hidden divide-x divide-slate-200/90">
            <div className="flex-1 min-w-0 flex flex-col items-center gap-1 px-2 py-2.5 sm:py-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-blue-100">
                L
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Left</span>
              <span className="text-sm font-bold tabular-nums text-blue-700 leading-tight">{formatINR(user.left_carry_bv)}</span>
            </div>
            <div className="flex-1 min-w-0 flex flex-col items-center gap-1 px-2 py-2.5 sm:py-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-fuchsia-100">
                R
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Right</span>
              <span className="text-sm font-bold tabular-nums text-fuchsia-700 leading-tight">{formatINR(user.right_carry_bv)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-3 sm:px-4 sm:py-3 shadow-sm ring-1 ring-violet-500/[0.06]">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 shrink-0">
              <Wallet className="w-3.5 h-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 leading-tight">Secure Coin wallet</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Linked platform wallet</p>
            </div>
          </div>
          {user.secure_wallet_linked ? (
            <div className="rounded-lg border border-violet-100 bg-gradient-to-b from-violet-50/40 to-white px-3 py-2.5 flex flex-col sm:flex-row sm:items-stretch sm:divide-x sm:divide-violet-100 gap-3 sm:gap-0 sm:py-0">
              <div className="flex-1 min-w-0 sm:px-3 sm:py-2.5 flex flex-col justify-center">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Wallet ID</span>
                <p className="text-xs font-mono font-medium text-slate-900 mt-1 break-all leading-snug">{user.secure_wallet_id ?? "—"}</p>
              </div>
              <div className="shrink-0 sm:w-[42%] sm:px-3 sm:py-2.5 flex flex-col justify-center sm:items-end border-t border-violet-100 pt-2 sm:border-t-0 sm:pt-0">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:text-right">Balance</span>
                <p className="text-lg font-bold tabular-nums text-violet-900 mt-0.5 sm:text-right leading-none">{formatINR(user.secure_wallet_balance)}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-8">
              <p className="text-xs text-slate-500">Not linked</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 pt-2 border-t border-slate-100 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Direct cap usage</span>
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              {formatINR(user.total_direct_earned)} / {formatINR(user.max_direct_cap)} ({directPct.toFixed(1)}%)
            </span>
          </div>
          <Bar pct={directPct} color="bg-emerald-500" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Binary cap usage</span>
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              {formatINR(user.total_binary_earned)} / {formatINR(user.max_binary_cap)} ({binaryPct.toFixed(1)}%)
            </span>
          </div>
          <Bar pct={binaryPct} color="bg-indigo-500" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Today&apos;s binary cap</span>
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              {formatINR(user.today_binary_earned)} / {formatINR(user.daily_binary_cap)} ({dailyPct.toFixed(1)}%)
            </span>
          </div>
          <Bar pct={dailyPct} color="bg-amber-500" />
        </div>
      </div>
    </ActionModal>
  );
}

function ManageUserModal({
  user,
  adjustments,
  onClose,
  onToggleBlock,
  onAdjust,
}: {
  user: User;
  adjustments: AdjustmentLog[];
  onClose: () => void;
  onToggleBlock: (u: User) => void;
  onAdjust: (u: User, wallet: "DIRECT" | "TEAM", entryType: "CREDIT" | "DEBIT", amountPaise: number, note: string) => void;
}) {
  const [wallet, setWallet] = useState<"DIRECT" | "TEAM">("DIRECT");
  const [entryType, setEntryType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const amountPaise = Math.max(0, Math.round(Number(amount || 0) * 100));
  const canSubmit = amountPaise > 0 && note.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onAdjust(user, wallet, entryType, amountPaise, note.trim());
    setAmount(""); setNote("");
  };

  const isBlocked = user.status === "BLOCKED";
  const currentBal = wallet === "DIRECT" ? user.direct_balance : user.team_balance;

  return (
    <ActionModal
      title={`Manage · ${user.full_name}`}
      onClose={onClose}
      maxWidth="max-w-2xl"
      titleIcon={<Settings2 className="w-5 h-5" />}
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[11px] font-mono text-slate-600">{user.sponsor_id}</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-600">{user.email}</span>
          <span className="text-slate-300">·</span>
          <Badge status={user.status} />
          {user.package_name && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-600">{user.package_name} · {user.package_amount ? formatINR(user.package_amount) : "—"}</span>
            </>
          )}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className={cn(
            "flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100",
            isBlocked ? "bg-rose-50/70" : "bg-emerald-50/60"
          )}>
            <div className="flex items-center gap-2.5">
              <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center",
                isBlocked ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600")}>
                {isBlocked ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{isBlocked ? "Account blocked" : "Account active"}</p>
                <p className="text-[11px] text-slate-500">{isBlocked ? "Networker cannot log in or earn commissions until unblocked." : "Blocking will disable login, placements and commissions immediately."}</p>
              </div>
            </div>
            <Button
              variant={isBlocked ? "primary" : "danger"}
              size="sm"
              icon={isBlocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              onClick={() => onToggleBlock(user)}
            >
              {isBlocked ? "Unblock user" : "Block user"}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Wallet adjustment</h4>
              <p className="text-[11px] text-slate-500">Credit or debit a networker&apos;s direct / team wallet. Posts an <span className="font-mono">ADMIN_ADJUSTMENT</span> ledger entry.</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Wallet</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["DIRECT", "TEAM"] as const).map((w) => {
                    const active = wallet === w;
                    return (
                      <button
                        type="button"
                        key={w}
                        onClick={() => setWallet(w)}
                        className={cn(
                          "h-10 rounded-lg border text-xs font-semibold transition-all",
                          active
                            ? (w === "DIRECT" ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100" : "border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-100")
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        )}
                      >
                        {w} wallet
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Entry type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["CREDIT", "DEBIT"] as const).map((t) => {
                    const active = entryType === t;
                    const Icon = t === "CREDIT" ? Plus : Minus;
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setEntryType(t)}
                        className={cn(
                          "h-10 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all",
                          active
                            ? (t === "CREDIT" ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100" : "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-100")
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />{t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 px-3 py-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Current {wallet} balance</span>
              <span className="text-sm font-bold tabular-nums text-slate-800">{formatINR(currentBal)}</span>
            </div>

            <Input
              label="Amount (₹)"
              type="number"
              step="0.01"
              min={0}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              hint="Stored in paise on the ledger. 1 INR = 100 paise."
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Reason / note <span className="text-rose-500">*</span></label>
              <textarea
                className="w-full min-h-[80px] px-4 py-2.5 rounded-[10px] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/20 focus:border-[var(--primary-500)]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Audit trail note, e.g. ‘Manual payout reversal for po-1023’"
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant={entryType === "CREDIT" ? "primary" : "danger"}
                icon={entryType === "CREDIT" ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                onClick={submit}
                disabled={!canSubmit}
              >
                {entryType === "CREDIT" ? `Credit ${amountPaise > 0 ? formatINR(amountPaise) : "amount"}` : `Debit ${amountPaise > 0 ? formatINR(amountPaise) : "amount"}`}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
            <span className="w-8 h-8 rounded-lg bg-slate-200/70 text-slate-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-semibold text-slate-800">Recent adjustments for this user</h4>
          </div>
          <div className="p-4">
            {adjustments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No manual adjustments yet.</p>
            ) : (
              <ul className="space-y-2">
                {adjustments.slice().reverse().slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                    <span className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      a.entry_type === "CREDIT" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    )}>
                      {a.entry_type === "CREDIT" ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 tabular-nums">
                          {a.entry_type === "CREDIT" ? "+" : "−"}{formatINR(a.amount)} <span className="text-[11px] font-normal text-slate-500">· {a.wallet}</span>
                        </p>
                        <span className="text-[10px] text-slate-400">{formatDate(a.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">{a.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </ActionModal>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(USERS_INITIAL);
  const [adjustments, setAdjustments] = useState<AdjustmentLog[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [packageFilter, setPackageFilter] = useState("");
  const [page, setPage] = useState(1);

  const packageOptions = useMemo(
    () => [
      { value: "", label: "All packages" },
      ...PACKAGES_INITIAL.map((p) => ({ value: p.name, label: `${p.name} · ${formatINR(p.amount)}` })),
    ],
    [],
  );
  const [detail, setDetail] = useState<User | null>(null);
  const [manageId, setManageId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const manageUser = manageId ? users.find((u) => u.user_id === manageId) ?? null : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter && u.status !== statusFilter) return false;
      if (packageFilter && u.package_name !== packageFilter) return false;
      if (q) {
        const hay = [u.full_name, u.email, u.sponsor_id, u.phone, u.package_name].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, search, statusFilter, packageFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActive = !!search.trim() || !!statusFilter || !!packageFilter;

  const clearFilters = () => { setSearch(""); setStatusFilter(""); setPackageFilter(""); setPage(1); };

  React.useEffect(() => { setPage(1); }, [search, statusFilter, packageFilter]);
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2800);
  };

  const toggleBlock = (u: User) => {
    setUsers((prev) => prev.map((x) =>
      x.user_id === u.user_id
        ? { ...x, status: x.status === "BLOCKED" ? "ACTIVE" : "BLOCKED" }
        : x
    ));
    flash(u.status === "BLOCKED" ? `${u.full_name} has been unblocked.` : `${u.full_name} is now blocked.`);
  };

  const adjustWallet = (
    u: User,
    wallet: "DIRECT" | "TEAM",
    entryType: "CREDIT" | "DEBIT",
    amountPaise: number,
    note: string,
  ) => {
    setUsers((prev) => prev.map((x) => {
      if (x.user_id !== u.user_id) return x;
      const delta = entryType === "CREDIT" ? amountPaise : -amountPaise;
      if (wallet === "DIRECT") return { ...x, direct_balance: Math.max(0, x.direct_balance + delta) };
      return { ...x, team_balance: Math.max(0, x.team_balance + delta) };
    }));
    setAdjustments((prev) => [
      ...prev,
      {
        id: (prev[prev.length - 1]?.id ?? 0) + 1,
        user_id: u.user_id,
        wallet,
        entry_type: entryType,
        amount: amountPaise,
        note,
        created_at: new Date().toISOString(),
      },
    ]);
    flash(`${entryType === "CREDIT" ? "Credited" : "Debited"} ₹${(amountPaise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${wallet} wallet`);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md text-white">
            <UsersIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Networkers</h1>
            <p className="text-sm text-[var(--text-muted)]">Browse, filter, inspect and manage MLM networker accounts.</p>
          </div>
        </div>
        <div className="text-xs text-[var(--text-muted)] tabular-nums">
          Showing <span className="font-semibold text-[var(--text-primary)]">{filtered.length}</span> of {users.length}
        </div>
      </div>

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
          <Select options={USER_STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
          <Select options={packageOptions} value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)} />
        </div>
        {hasActive && (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-slate-50/95">
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Networker</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">SPF Code</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Package</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Status</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">Direct earned</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">Binary earned</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {pageData.map((u) => (
                <tr key={u.user_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{u.full_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
                  </td>
                  <td className="px-5 py-4 text-sm font-mono text-[var(--text-primary)]">{u.sponsor_id}</td>
                  <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                    {u.package_name ?? "—"}
                    <span className="block text-[11px] text-[var(--text-muted)]">
                      {u.package_amount ? formatINR(u.package_amount) : ""}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Badge status={u.status} />
                    {u.placement_status === "PENDING_PLACEMENT" && (
                      <span className="block mt-1"><Badge status="PENDING_PLACEMENT" /></span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">
                    <span className="font-semibold text-[var(--text-primary)]">{formatINR(u.total_direct_earned)}</span>
                    <span className="block text-[11px] text-[var(--text-muted)]">of {formatINR(u.max_direct_cap)}</span>
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">
                    <span className="font-semibold text-[var(--text-primary)]">{formatINR(u.total_binary_earned)}</span>
                    <span className="block text-[11px] text-[var(--text-muted)]">of {formatINR(u.max_binary_cap)}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button variant="secondary" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setDetail(u)}>
                        View
                      </Button>
                      <Button variant="primary" size="sm" icon={<Settings2 className="w-3.5 h-3.5" />} onClick={() => setManageId(u.user_id)}>
                        Manage
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-[var(--text-muted)]">No networkers match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} icon={<ChevronLeft className="w-3.5 h-3.5" />}>Prev</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} icon={<ChevronRight className="w-3.5 h-3.5" />} iconPosition="right">Next</Button>
          </div>
        </div>
      </Card>

      {detail && <UserDetail user={detail} onClose={() => setDetail(null)} />}
      {manageUser && (
        <ManageUserModal
          user={manageUser}
          adjustments={adjustments.filter((a) => a.user_id === manageUser.user_id)}
          onClose={() => setManageId(null)}
          onToggleBlock={toggleBlock}
          onAdjust={adjustWallet}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] rounded-xl border border-emerald-200 bg-white text-emerald-800 shadow-xl px-4 py-3 flex items-center gap-2 animate-fade-up">
          <CheckCircle2 className="w-4 h-4" />
          <p className="text-sm font-semibold">{toast}</p>
        </div>
      )}
    </div>
  );
}
