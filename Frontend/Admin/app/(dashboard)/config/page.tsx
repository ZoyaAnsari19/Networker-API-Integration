"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Settings,
  Percent,
  Banknote,
  Save,
  RotateCcw,
  AlertTriangle,
  CalendarDays,
  Sparkles,
  ArrowLeftRight,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  COMMISSION_CONFIG_INITIAL,
  PAYOUT_CONFIG_INITIAL,
  P2P_TRANSFER_CONFIG_INITIAL,
} from "@/lib/mock-data";
import { COMMISSION_CONFIG_META, PAYOUT_CONFIG_META, P2P_TRANSFER_CONFIG_META } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

type KV = { key: string; value: string; updated_at: string };
type TabId = "commission" | "payout" | "p2p";

const TABS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
  { id: "commission", label: "Commissions & Placement", icon: Percent,        desc: "Direct, binary-match, franchise and placement rules." },
  { id: "payout",     label: "Withdrawals",              icon: Banknote,       desc: "Per-wallet calendar days, daily time window (e.g. 10:00–18:00), limits and minimum amount." },
  { id: "p2p",        label: "P2P transfer rules",       icon: ArrowLeftRight, desc: "Service charge, limits, daily cap and kill-switch." },
];

/** When set, withdrawal time-start/end rows are merged into the allowed-dates card (payout tab). */
const WITHDRAWAL_DATE_TIME_BUNDLE: Record<string, { timeStart: string; timeEnd: string }> = {
  direct_wallet_allowed_dates: {
    timeStart: "direct_wallet_withdrawal_time_start",
    timeEnd: "direct_wallet_withdrawal_time_end",
  },
  team_wallet_allowed_dates: {
    timeStart: "team_wallet_withdrawal_time_start",
    timeEnd: "team_wallet_withdrawal_time_end",
  },
};

const WITHDRAWAL_TIME_KEYS_SKIP_WHEN_BUNDLED = new Set(
  Object.values(WITHDRAWAL_DATE_TIME_BUNDLE).flatMap((b) => [b.timeStart, b.timeEnd]),
);

function timeInputClassName() {
  return "w-full h-10 px-3 rounded-[10px] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/20 focus:border-[var(--primary-500)]";
}

function parseAllowedDates(raw: string): number[] {
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 31).sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function AllowedDatesEditor({
  value,
  onChange,
  accent = "indigo",
}: {
  value: string;
  onChange: (v: string) => void;
  accent?: "indigo" | "emerald";
}) {
  const selected = new Set(parseAllowedDates(value));
  const today = new Date().getDate();
  const accentCls =
    accent === "emerald"
      ? {
          chip: "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-100",
          hover: "hover:border-emerald-300 hover:bg-emerald-50/60",
        }
      : {
          chip: "bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-100",
          hover: "hover:border-indigo-300 hover:bg-indigo-50/50",
        };
  const toggle = (n: number) => {
    const next = new Set(selected);
    if (next.has(n)) next.delete(n); else next.add(n);
    onChange(JSON.stringify(Array.from(next).sort((a, b) => a - b)));
  };
  const preset = (arr: number[]) => onChange(JSON.stringify(arr));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)]">
          <CalendarDays className="w-3.5 h-3.5" />Presets:
        </span>
        {[
          { l: "5, 15, 25", v: [5, 15, 25] },
          { l: "1, 15",     v: [1, 15] },
          { l: "1st only",  v: [1] },
          { l: "Every day", v: Array.from({ length: 31 }, (_, i) => i + 1) },
          { l: "Clear",     v: [] as number[] },
        ].map((p) => (
          <button
            key={p.l}
            type="button"
            onClick={() => preset(p.v)}
            className="px-2.5 py-1 rounded-full border border-[var(--border)] text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-slate-50 transition-colors"
          >
            {p.l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => {
          const isSelected = selected.has(n);
          const isToday = n === today;
          return (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              className={cn(
                "h-9 rounded-lg text-xs font-semibold tabular-nums transition-all border",
                isSelected
                  ? accentCls.chip
                  : cn("bg-white text-slate-700 border-slate-200", accentCls.hover),
                isToday && !isSelected && "ring-1 ring-amber-300"
              )}
              title={isToday ? "Today" : undefined}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[var(--text-muted)]">
        {selected.size === 0 ? (
          <span className="text-rose-600 font-medium">No dates selected — withdrawals blocked unless the 24-hour override is on.</span>
        ) : (
          <>Selected {selected.size} day{selected.size === 1 ? "" : "s"} of the month: <span className="font-mono text-[var(--text-secondary)]">{Array.from(selected).sort((a, b) => a - b).join(", ")}</span></>
        )}
      </p>
    </div>
  );
}

function AllowTodayToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const on = value === "true";
  const [todayLabel, setTodayLabel] = useState("");
  useEffect(() => {
    setTodayLabel(new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }));
  }, []);
  return (
    <button
      type="button"
      onClick={() => onChange(on ? "false" : "true")}
      className={cn(
        "w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all",
        on ? "border-emerald-400 bg-emerald-50/70" : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          on ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-100 text-slate-500"
        )}>
          <Sparkles className="w-5 h-5" />
        </span>
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-800">
            {on ? "All withdrawal types open for 24 hours" : "Use per-wallet calendar dates only"}
          </p>
          <p className="text-[11px] text-slate-500">
            {on ? (
              <>
                DIRECT and TEAM wallets can raise withdrawal requests for the <span className="font-semibold text-slate-700">next 24 hours</span>, ignoring the day-of-month lists above.
              </>
            ) : (
              <>
                Now <span className="font-semibold text-slate-700">{todayLabel || "—"}</span>. Withdrawals follow each wallet&apos;s allowed dates until you turn on the 24-hour override.
              </>
            )}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
          on ? "bg-emerald-500" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            on && "translate-x-5"
          )}
        />
      </span>
    </button>
  );
}

function renderValueEditor(
  meta: { type: "number" | "percent" | "boolean" | "string" | "json"; unit?: string },
  value: string,
  onChange: (v: string) => void,
  keyName: string,
) {
  if (keyName === "direct_wallet_allowed_dates") {
    return <AllowedDatesEditor value={value} onChange={onChange} accent="indigo" />;
  }
  if (keyName === "team_wallet_allowed_dates") {
    return <AllowedDatesEditor value={value} onChange={onChange} accent="emerald" />;
  }
  if (keyName === "allow_today") {
    return <AllowTodayToggle value={value} onChange={onChange} />;
  }
  if (
    keyName === "direct_wallet_withdrawal_time_start" ||
    keyName === "direct_wallet_withdrawal_time_end" ||
    keyName === "team_wallet_withdrawal_time_start" ||
    keyName === "team_wallet_withdrawal_time_end"
  ) {
    return (
      <input
        type="time"
        className={timeInputClassName()}
        value={value.length >= 5 ? value.slice(0, 5) : value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (keyName === "p2p_disabled") {
    return (
      <Select
        options={[
          { value: "false", label: "P2P transfers allowed" },
          { value: "true", label: "P2P transfers disabled" },
        ]}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (meta.type === "boolean") {
    return (
      <Select
        options={[{ value: "true", label: "Enabled" }, { value: "false", label: "Disabled" }]}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (keyName === "placement_weaker_by") {
    return (
      <Select
        options={[
          { value: "subtree_bv", label: "subtree_bv (by business volume)" },
          { value: "subtree_count", label: "subtree_count (by user count)" },
          { value: "direct", label: "direct (by direct referrals)" },
        ]}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (meta.type === "json") {
    return (
      <textarea
        className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] border border-[var(--border)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/20 focus:border-[var(--primary-500)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='[5, 15, 25]'
      />
    );
  }
  return (
    <div className="relative">
      <input
        type={meta.type === "number" || meta.type === "percent" ? "number" : "text"}
        step={meta.type === "percent" ? "0.01" : "any"}
        className="w-full h-11 px-4 pr-16 rounded-[10px] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/20 focus:border-[var(--primary-500)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {meta.unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-muted)]">{meta.unit}</span>
      )}
    </div>
  );
}

function ConfigSection({
  rows,
  setRows,
  meta,
  emptyLabel,
  bundleWithdrawalTimes = false,
}: {
  rows: KV[];
  setRows: React.Dispatch<React.SetStateAction<KV[]>>;
  meta: Record<string, { label: string; description: string; type: "number" | "percent" | "boolean" | "string" | "json"; unit?: string }>;
  emptyLabel: string;
  /** Payout tab: hide standalone withdrawal time cards; editors live beside each wallet's calendar. */
  bundleWithdrawalTimes?: boolean;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.key, r.value])));
  const [saveFlash, setSaveFlash] = useState<string | null>(null);

  const dirtyKeys = useMemo(() => rows.filter((r) => draft[r.key] !== r.value).map((r) => r.key), [rows, draft]);

  const saveKey = (key: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, value: draft[key], updated_at: new Date().toISOString() } : r)));
    setSaveFlash(key);
    setTimeout(() => setSaveFlash((k) => (k === key ? null : k)), 1500);
  };
  const revertKey = (key: string) => {
    const original = rows.find((r) => r.key === key);
    if (original) setDraft((d) => ({ ...d, [key]: original.value }));
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <div className="text-sm text-[var(--text-muted)] text-center py-10">{emptyLabel}</div>
      )}
      {rows.map((r) => {
        if (bundleWithdrawalTimes && WITHDRAWAL_TIME_KEYS_SKIP_WHEN_BUNDLED.has(r.key)) {
          return null;
        }
        const m = meta[r.key] ?? { label: r.key, description: "", type: "string" as const };
        const val = draft[r.key] ?? r.value;
        const bundle = bundleWithdrawalTimes ? WITHDRAWAL_DATE_TIME_BUNDLE[r.key] : undefined;
        const startRow = bundle ? rows.find((x) => x.key === bundle.timeStart) : undefined;
        const endRow = bundle ? rows.find((x) => x.key === bundle.timeEnd) : undefined;
        const startMeta = bundle && startRow ? meta[startRow.key] : undefined;
        const endMeta = bundle && endRow ? meta[endRow.key] : undefined;
        const startVal =
          bundle && startRow ? (draft[startRow.key] ?? startRow.value) : "";
        const endVal = bundle && endRow ? (draft[endRow.key] ?? endRow.value) : "";
        const bundleDirty =
          !!bundle &&
          startRow &&
          endRow &&
          (val !== r.value || startVal !== startRow.value || endVal !== endRow.value);
        const isDirty = bundle ? bundleDirty : val !== r.value;

        const saveBundle = () => {
          if (!bundle || !startRow || !endRow) return;
          if (val !== r.value) saveKey(r.key);
          if (startVal !== startRow.value) saveKey(startRow.key);
          if (endVal !== endRow.value) saveKey(endRow.key);
        };
        const revertBundle = () => {
          if (!bundle || !startRow || !endRow) return;
          if (val !== r.value) revertKey(r.key);
          if (startVal !== startRow.value) revertKey(startRow.key);
          if (endVal !== endRow.value) revertKey(endRow.key);
        };

        const editor = bundle && startRow && endRow && startMeta && endMeta ? (
          <div className="flex flex-col xl:flex-row gap-5 xl:gap-6 xl:items-start">
            <div className="flex-1 min-w-0">
              <AllowedDatesEditor
                value={val}
                onChange={(v) => setDraft((d) => ({ ...d, [r.key]: v }))}
                accent={r.key === "team_wallet_allowed_dates" ? "emerald" : "indigo"}
              />
            </div>
            <div className="shrink-0 xl:w-[min(100%,12.5rem)] xl:border-l border-[var(--border)] xl:pl-5 pt-4 xl:pt-0 border-t xl:border-t-0">
              <p className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 mb-3">
                <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Daily time window
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1" title={`${startMeta.label}: ${startMeta.description}`}>
                    Starts
                  </label>
                  <input
                    type="time"
                    className={timeInputClassName()}
                    value={startVal.length >= 5 ? startVal.slice(0, 5) : startVal}
                    onChange={(e) => setDraft((d) => ({ ...d, [startRow.key]: e.target.value }))}
                  />
                  <p className="text-[9px] font-mono text-[var(--text-muted)] mt-1">{startRow.key}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1" title={`${endMeta.label}: ${endMeta.description}`}>
                    Ends
                  </label>
                  <input
                    type="time"
                    className={timeInputClassName()}
                    value={endVal.length >= 5 ? endVal.slice(0, 5) : endVal}
                    onChange={(e) => setDraft((d) => ({ ...d, [endRow.key]: e.target.value }))}
                  />
                  <p className="text-[9px] font-mono text-[var(--text-muted)] mt-1">{endRow.key}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          renderValueEditor(m, val, (v) => setDraft((d) => ({ ...d, [r.key]: v })), r.key)
        );

        const flashKey =
          bundle && startRow && endRow
            ? [r.key, startRow.key, endRow.key].find((k) => saveFlash === k)
            : saveFlash === r.key
              ? r.key
              : undefined;

        return (
          <div key={r.key} className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-sm)]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-5">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{m.label}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{m.description}</p>
                <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1.5">{r.key}</p>
              </div>
              <div className="md:col-span-5">
                {editor}
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5">Last updated {formatDate(r.updated_at)}</p>
              </div>
              <div className="md:col-span-2 flex md:justify-end gap-1.5">
                {isDirty ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Save className="w-3.5 h-3.5" />}
                      onClick={() => (bundle ? saveBundle() : saveKey(r.key))}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={() => (bundle ? revertBundle() : revertKey(r.key))}
                    >
                      Revert
                    </Button>
                  </>
                ) : flashKey ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">Saved</span>
                ) : (
                  <span className="text-[11px] text-[var(--text-muted)]">—</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {dirtyKeys.length > 0 && (
        <div className="sticky bottom-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm font-semibold">{dirtyKeys.length} unsaved change{dirtyKeys.length > 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => dirtyKeys.forEach(revertKey)}>Revert all</Button>
            <Button size="sm" variant="primary" icon={<Save className="w-3.5 h-3.5" />} onClick={() => dirtyKeys.forEach(saveKey)}>Save all</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfigPage() {
  const [tab, setTab] = useState<TabId>("commission");
  const [commission, setCommission] = useState<KV[]>(COMMISSION_CONFIG_INITIAL);
  const [payout, setPayout] = useState<KV[]>(PAYOUT_CONFIG_INITIAL);
  const [p2p, setP2p] = useState<KV[]>(P2P_TRANSFER_CONFIG_INITIAL);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md text-white">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Platform configuration</h1>
          <p className="text-sm text-[var(--text-muted)]">Tune commission rules, withdrawals, P2P transfers and placement for the binary MLM engine.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)]">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors",
                active
                  ? "border-[var(--primary-600)] text-[var(--primary-600)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--text-muted)]">{TABS.find((t) => t.id === tab)?.desc}</p>

      {tab === "commission" && (
        <ConfigSection rows={commission} setRows={setCommission} meta={COMMISSION_CONFIG_META} emptyLabel="No commission configuration keys." />
      )}
      {tab === "payout" && (
        <ConfigSection
          rows={payout}
          setRows={setPayout}
          meta={PAYOUT_CONFIG_META}
          emptyLabel="No withdrawal configuration keys."
          bundleWithdrawalTimes
        />
      )}
      {tab === "p2p" && (
        <ConfigSection rows={p2p} setRows={setP2p} meta={P2P_TRANSFER_CONFIG_META} emptyLabel="No P2P configuration keys." />
      )}
    </div>
  );
}
