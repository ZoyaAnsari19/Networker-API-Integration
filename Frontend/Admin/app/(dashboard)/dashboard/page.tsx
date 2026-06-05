"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Package as PkgIcon,
  TrendingUp,
  GitBranch,
  FileCheck2,
  Landmark,
  ChevronRight,
  Wallet,
  ShieldAlert,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/charts/sparkline";
import { cn, formatINR } from "@/lib/utils";
import {
  loadDashboardStats,
  type DashboardStats,
} from "@/lib/admin-dashboard";
import { ApiError } from "@/lib/api-client";
import { LEDGER_INITIAL } from "@/lib/mock-data";

type KpiColorKey = "blue" | "emerald" | "amber" | "violet" | "sky" | "teal" | "rose";

const colorMap: Record<KpiColorKey, { bg: string; icon: string; stroke: string; fill: string }> = {
  blue:    { bg: "bg-blue-500/10",    icon: "text-blue-600",    stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.15)" },
  emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-600", stroke: "#10b981", fill: "rgba(16, 185, 129, 0.15)" },
  amber:   { bg: "bg-amber-500/10",   icon: "text-amber-600",   stroke: "#d97706", fill: "rgba(217, 119, 6, 0.15)" },
  violet:  { bg: "bg-violet-500/10",  icon: "text-violet-600",  stroke: "#7c3aed", fill: "rgba(124, 58, 237, 0.15)" },
  sky:     { bg: "bg-sky-500/10",     icon: "text-sky-600",     stroke: "#0284c7", fill: "rgba(14, 165, 233, 0.15)" },
  teal:    { bg: "bg-teal-500/10",    icon: "text-teal-600",    stroke: "#0d9488", fill: "rgba(13, 148, 136, 0.15)" },
  rose:    { bg: "bg-rose-500/10",    icon: "text-rose-600",    stroke: "#e11d48", fill: "rgba(225, 29, 72, 0.15)" },
};

function genTrend(seed: number, len = 7): number[] {
  const arr: number[] = [];
  let v = 10 + (seed % 20);
  for (let i = 0; i < len; i++) {
    v += ((seed * (i + 3)) % 7) - 2;
    arr.push(Math.max(0, v));
  }
  return arr;
}

const EMPTY_STATS: DashboardStats = {
  totalUsers: 0,
  activeUsers: 0,
  pendingKyc: 0,
  pendingPayouts: 0,
  activePackages: 0,
  directToday: 0,
  binaryToday: 0,
  directTotal: 0,
  binaryTotal: 0,
  recentPayouts: [],
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [todayLine, setTodayLine] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTodayLine(
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadDashboardStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load dashboard";
          setError(msg);
          setStats(EMPTY_STATS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const s = stats ?? EMPTY_STATS;

  const recentLedger = useMemo(
    () =>
      [...LEDGER_INITIAL]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 5),
    [],
  );

  const kpiCards: Array<{
    label: string;
    value: string;
    trend: number[];
    icon: LucideIcon;
    color: KpiColorKey;
    path: string;
    alert?: boolean;
  }> = useMemo(
    () => [
      {
        label: "Total networkers",
        value: s.totalUsers.toLocaleString(),
        trend: genTrend(s.totalUsers),
        icon: Users,
        color: "blue",
        path: "/users",
      },
      {
        label: "Active networkers",
        value: s.activeUsers.toLocaleString(),
        trend: genTrend(s.activeUsers),
        icon: Users,
        color: "emerald",
        path: "/users",
      },
      {
        label: "Pending KYC",
        value: String(s.pendingKyc),
        trend: genTrend(s.pendingKyc + 2),
        icon: FileCheck2,
        color: "amber",
        path: "/kyc-requests",
        alert: s.pendingKyc > 0,
      },
      {
        label: "Pending withdrawals",
        value: String(s.pendingPayouts),
        trend: genTrend(s.pendingPayouts + 5),
        icon: Landmark,
        color: "rose",
        path: "/payouts",
        alert: s.pendingPayouts > 0,
      },
    ],
    [s],
  );

  const incomeCards: Array<{
    label: string;
    value: string;
    sub: string;
    trend: number[];
    icon: LucideIcon;
    color: KpiColorKey;
    path: string;
  }> = useMemo(
    () => [
      {
        label: "Direct income today",
        value: formatINR(s.directToday),
        sub: "Per-day direct totals require income reporting API",
        trend: genTrend(17),
        icon: TrendingUp,
        color: "violet",
        path: "/income/direct",
      },
      {
        label: "Binary income today",
        value: formatINR(s.binaryToday),
        sub: "Sum of networker today_binary_earned",
        trend: genTrend(23),
        icon: GitBranch,
        color: "sky",
        path: "/income/binary",
      },
      {
        label: "Monthly income (networkers)",
        value: formatINR(s.directTotal),
        sub: "Sum of monthly_income_paise across networkers",
        trend: genTrend(31),
        icon: TrendingUp,
        color: "teal",
        path: "/income/direct",
      },
      {
        label: "Binary earned today (total)",
        value: formatINR(s.binaryTotal),
        sub: "Platform-wide binary credits today",
        trend: genTrend(37),
        icon: GitBranch,
        color: "emerald",
        path: "/income/binary",
      },
    ],
    [s],
  );

  return (
    <div className="space-y-8 pb-8">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-indigo-500/[0.07] via-white to-slate-50/80 shadow-[var(--shadow-sm)] px-5 py-5 sm:px-7 sm:py-6">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-400/15 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3 min-w-0">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md text-white">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5 max-w-2xl">
                Operational overview for the Binary MLM platform — networkers, KYC, withdrawals, and packages.
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)] font-medium shrink-0 sm:text-right tabular-nums min-h-[1.25rem]">
            {todayLine || "\u00a0"}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading dashboard…</span>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card, i) => {
              const Icon = card.icon;
              const c = colorMap[card.color];
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => router.push(card.path)}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-300",
                    "hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400",
                    "animate-card-entrance",
                    card.alert ? "border-amber-200 ring-1 ring-amber-100" : "border-slate-200/90",
                  )}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                          c.bg,
                          c.icon,
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {card.alert && (
                        <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse ring-4 ring-amber-500/10" />
                      )}
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-4 tabular-nums">
                      {card.value}
                    </p>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">{card.label}</p>
                    <div className="mt-4 h-12 w-full rounded-xl overflow-hidden bg-gradient-to-b from-slate-50/60 to-slate-100/40">
                      <Sparkline
                        data={card.trend}
                        width={280}
                        height={48}
                        strokeColor={c.stroke}
                        fillColor={c.fill}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {incomeCards.map((card, i) => {
              const Icon = card.icon;
              const c = colorMap[card.color];
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => router.push(card.path)}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-300",
                    "hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400",
                    "animate-card-entrance border-slate-200/90",
                  )}
                  style={{ animationDelay: `${(kpiCards.length + i) * 80}ms` }}
                >
                  <div className="relative">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                        c.bg,
                        c.icon,
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-4 tabular-nums">
                      {card.value}
                    </p>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">{card.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                    <div className="mt-4 h-12 w-full rounded-xl overflow-hidden bg-gradient-to-b from-slate-50/60 to-slate-100/40">
                      <Sparkline
                        data={card.trend}
                        width={280}
                        height={48}
                        strokeColor={c.stroke}
                        fillColor={c.fill}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
            <Card
              title="Recent ledger activity"
              description="Latest credits and debits across all wallets."
              actions={
                <Link
                  href="/ledger"
                  className="inline-flex items-center gap-1 rounded-full border border-indigo-200/70 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 hover:border-indigo-300/80"
                >
                  View ledger <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
              padding="none"
            >
              <ul className="divide-y divide-[var(--border)]">
                {recentLedger.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        e.entry_type === "CREDIT"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-rose-500/10 text-rose-600",
                      )}
                    >
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {e.user_name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            <span className="font-mono">{e.sponsor_id}</span> · {e.wallet_type}{" "}
                            · {e.source.replace(/_/g, " ").toLowerCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "text-sm font-bold tabular-nums",
                              e.entry_type === "CREDIT"
                                ? "text-emerald-700"
                                : "text-rose-700",
                            )}
                          >
                            {e.entry_type === "CREDIT" ? "+" : "−"}
                            {formatINR(e.amount)}
                          </p>
                          <div className="mt-1">
                            <Badge status={e.entry_type} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card
              title="Recent withdrawal requests"
              description="Latest payout requests across all statuses."
              actions={
                <Link
                  href="/payouts"
                  className="inline-flex items-center gap-1 rounded-full border border-indigo-200/70 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 hover:border-indigo-300/80"
                >
                  View withdrawals <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
              padding="none"
            >
              {s.recentPayouts.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm text-[var(--text-muted)]">No withdrawal requests yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {s.recentPayouts.map((p) => (
                    <li
                      key={p.payout_id}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                              {p.user_name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] truncate">
                              <span className="font-mono">{p.sponsor_id}</span> · {p.wallet_type}{" "}
                              wallet
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                              {formatINR(p.requested_amount)}
                            </p>
                            <div className="mt-1">
                              <Badge status={p.status} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Quick actions" description="Jump into key admin operations.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  path: "/packages",
                  icon: PkgIcon,
                  label: "Manage packages",
                  iconBg: "bg-emerald-100",
                  iconColor: "text-emerald-600",
                },
                {
                  path: "/config",
                  icon: ShieldAlert,
                  label: "Platform config",
                  iconBg: "bg-indigo-100",
                  iconColor: "text-indigo-600",
                },
                {
                  path: "/ledger",
                  icon: BookOpen,
                  label: "Wallet ledger",
                  iconBg: "bg-sky-100",
                  iconColor: "text-sky-600",
                },
                {
                  path: "/kyc-requests",
                  icon: FileCheck2,
                  label: "KYC requests",
                  iconBg: "bg-amber-100",
                  iconColor: "text-amber-600",
                },
              ].map(({ path, icon: Icon, label, iconBg, iconColor }) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => router.push(path)}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-left transition-all hover:border-slate-200 hover:bg-slate-50 w-full group"
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      iconBg,
                      iconColor,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                      {label}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
