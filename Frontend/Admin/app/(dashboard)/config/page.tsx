"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Settings,
  Percent,
  Banknote,
  Save,
  RotateCcw,
  AlertTriangle,
  CalendarDays,
  ArrowLeftRight,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { COMMISSION_CONFIG_META, PAYOUT_CONFIG_META, P2P_TRANSFER_CONFIG_META } from "@/lib/constants";
import {
  fetchCommissionConfigRows,
  fetchP2pConfigRows,
  fetchPayoutConfigRows,
  saveCommissionConfigKey,
  savePayoutConfigKey,
  type ConfigKV,
} from "@/lib/admin-platform-config";
import { ApiError } from "@/lib/api-client";
import { cn, formatDate } from "@/lib/utils";

type KV = ConfigKV;
type TabId = "commission" | "payout" | "p2p";

const TABS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
  { id: "commission", label: "Commissions & Placement", icon: Percent,        desc: "Direct, binary-match, franchise and placement rules." },
  { id: "payout",     label: "Withdrawals",              icon: Banknote,       desc: "Per-wallet calendar days, daily time window (e.g. 10:00–18:00), limits and minimum amount." },
  { id: "p2p",        label: "P2P transfer rules",       icon: ArrowLeftRight, desc: "Service charge, limits, daily cap and kill-switch." },
];


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

function renderValueEditor(
  meta: { type: "number" | "percent" | "boolean" | "string" | "json"; unit?: string },
  value: string,
  onChange: (v: string) => void,
  keyName: string,
) {
  if (
    keyName === "withdrawal_allowed_dates_direct" ||
    keyName === "withdrawal_allowed_dates_team"
  ) {
    return (
      <AllowedDatesEditor
        value={value}
        onChange={onChange}
        accent={keyName === "withdrawal_allowed_dates_team" ? "emerald" : "indigo"}
      />
    );
  }
  if (keyName === "p2p_enabled") {
    return (
      <Select
        options={[
          { value: "true", label: "P2P transfers enabled" },
          { value: "false", label: "P2P transfers disabled" },
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
  onSaveKey,
}: {
  rows: KV[];
  setRows: React.Dispatch<React.SetStateAction<KV[]>>;
  meta: Record<string, { label: string; description: string; type: "number" | "percent" | "boolean" | "string" | "json"; unit?: string }>;
  emptyLabel: string;
  onSaveKey: (key: string, value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.key, r.value])));
  const [saveFlash, setSaveFlash] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  }, [rows]);

  const dirtyKeys = useMemo(() => rows.filter((r) => draft[r.key] !== r.value).map((r) => r.key), [rows, draft]);

  const saveKey = async (key: string) => {
    setSavingKey(key);
    setSaveError(null);
    try {
      await onSaveKey(key, draft[key]);
      setRows((prev) =>
        prev.map((r) =>
          r.key === key ? { ...r, value: draft[key], updated_at: new Date().toISOString() } : r,
        ),
      );
      setSaveFlash(key);
      setTimeout(() => setSaveFlash((k) => (k === key ? null : k)), 1500);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save";
      setSaveError(msg);
    } finally {
      setSavingKey(null);
    }
  };
  const revertKey = (key: string) => {
    const original = rows.find((r) => r.key === key);
    if (original) setDraft((d) => ({ ...d, [key]: original.value }));
  };

  return (
    <div className="space-y-4">
      {saveError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm">
          {saveError}
        </div>
      )}
      {rows.length === 0 && (
        <div className="text-sm text-[var(--text-muted)] text-center py-10">{emptyLabel}</div>
      )}
      {rows.map((r) => {
        const m = meta[r.key] ?? { label: r.key, description: "", type: "string" as const };
        const val = draft[r.key] ?? r.value;
        const isDirty = val !== r.value;
        const isSaving = savingKey === r.key;

        return (
          <div key={r.key} className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-sm)]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-5">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{m.label}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{m.description}</p>
                <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1.5">{r.key}</p>
              </div>
              <div className="md:col-span-5">
                {renderValueEditor(m, val, (v) => setDraft((d) => ({ ...d, [r.key]: v })), r.key)}
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5">Last updated {formatDate(r.updated_at)}</p>
              </div>
              <div className="md:col-span-2 flex md:justify-end gap-1.5">
                {isDirty ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      onClick={() => saveKey(r.key)}
                      disabled={isSaving}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={() => revertKey(r.key)}
                      disabled={isSaving}
                    >
                      Revert
                    </Button>
                  </>
                ) : saveFlash === r.key ? (
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
            <Button size="sm" variant="secondary" onClick={() => dirtyKeys.forEach(revertKey)} disabled={!!savingKey}>
              Revert all
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              onClick={() => dirtyKeys.forEach((k) => void saveKey(k))}
              disabled={!!savingKey}
            >
              Save all
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfigPage() {
  const [tab, setTab] = useState<TabId>("commission");
  const [commission, setCommission] = useState<KV[]>([]);
  const [payout, setPayout] = useState<KV[]>([]);
  const [p2p, setP2p] = useState<KV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [commissionRows, payoutRows, p2pRows] = await Promise.all([
        fetchCommissionConfigRows(),
        fetchPayoutConfigRows(),
        fetchP2pConfigRows(),
      ]);
      setCommission(commissionRows);
      setPayout(payoutRows);
      setP2p(p2pRows);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load platform configuration";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

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

      {error && (
        <Card className="border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-800">{error}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void loadConfig()}>
            Retry
          </Button>
        </Card>
      )}

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

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading configuration…</span>
        </div>
      ) : (
        <>
          {tab === "commission" && (
            <ConfigSection
              rows={commission}
              setRows={setCommission}
              meta={COMMISSION_CONFIG_META}
              emptyLabel="No commission configuration keys."
              onSaveKey={saveCommissionConfigKey}
            />
          )}
          {tab === "payout" && (
            <ConfigSection
              rows={payout}
              setRows={setPayout}
              meta={PAYOUT_CONFIG_META}
              emptyLabel="No withdrawal configuration keys."
              onSaveKey={savePayoutConfigKey}
            />
          )}
          {tab === "p2p" && (
            <ConfigSection
              rows={p2p}
              setRows={setP2p}
              meta={P2P_TRANSFER_CONFIG_META}
              emptyLabel="No P2P configuration keys."
              onSaveKey={saveCommissionConfigKey}
            />
          )}
        </>
      )}
    </div>
  );
}
