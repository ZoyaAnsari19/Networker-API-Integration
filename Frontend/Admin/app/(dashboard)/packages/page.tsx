"use client";
import React, { useState } from "react";
import {
  Package as PkgIcon,
  Plus,
  Pencil,
  Calendar,
  Coins,
  TrendingUp,
  GitBranch,
  Gauge,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { ActionModal } from "@/components/modals/action-modal";
import { PACKAGES_INITIAL, type Package } from "@/lib/mock-data";
import { cn, formatINR, formatDate } from "@/lib/utils";

type Draft = {
  package_id?: string;
  name: string;
  amount_rupees: string;
  direct_cap_multiplier: string;
  binary_cap_multiplier: string;
  daily_binary_cap_rupees: string;
  status: "ACTIVE" | "DISABLED";
  sort_order: string;
};

function toDraft(p?: Package): Draft {
  if (!p) return {
    name: "",
    amount_rupees: "",
    direct_cap_multiplier: "4",
    binary_cap_multiplier: "10",
    daily_binary_cap_rupees: "",
    status: "ACTIVE",
    sort_order: "0",
  };
  return {
    package_id: p.package_id,
    name: p.name,
    amount_rupees: String(p.amount / 100),
    direct_cap_multiplier: String(p.direct_cap_multiplier),
    binary_cap_multiplier: String(p.binary_cap_multiplier),
    daily_binary_cap_rupees: String(p.daily_binary_cap / 100),
    status: p.status,
    sort_order: String(p.sort_order),
  };
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>(PACKAGES_INITIAL);
  const [editing, setEditing] = useState<{ draft: Draft; isNew: boolean } | null>(null);

  const openEdit = (p: Package) => setEditing({ draft: toDraft(p), isNew: false });
  const openCreate = () => setEditing({ draft: toDraft(), isNew: true });

  const saveEditing = () => {
    if (!editing) return;
    const d = editing.draft;
    const amount = Math.round(parseFloat(d.amount_rupees || "0") * 100);
    const dailyCap = Math.round(parseFloat(d.daily_binary_cap_rupees || "0") * 100);
    const nowIso = new Date().toISOString();
    if (editing.isNew) {
      const newPkg: Package = {
        package_id: `pkg-${Math.random().toString(36).slice(2, 8)}`,
        name: d.name.trim() || "New package",
        amount,
        direct_cap_multiplier: parseInt(d.direct_cap_multiplier || "4", 10),
        binary_cap_multiplier: parseInt(d.binary_cap_multiplier || "10", 10),
        daily_binary_cap: dailyCap,
        status: d.status,
        sort_order: parseInt(d.sort_order || "0", 10),
        created_at: nowIso,
        updated_at: nowIso,
      };
      setPackages((prev) => [newPkg, ...prev]);
    } else {
      setPackages((prev) => prev.map((p) => p.package_id === d.package_id ? {
        ...p,
        name: d.name,
        amount,
        direct_cap_multiplier: parseInt(d.direct_cap_multiplier, 10),
        binary_cap_multiplier: parseInt(d.binary_cap_multiplier, 10),
        daily_binary_cap: dailyCap,
        status: d.status,
        sort_order: parseInt(d.sort_order, 10),
        updated_at: nowIso,
      } : p));
    }
    setEditing(null);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md text-white">
            <PkgIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Packages</h1>
            <p className="text-sm text-[var(--text-muted)]">Price tiers that drive direct &amp; binary caps. All values stored in paise.</p>
          </div>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>New package</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {packages.map((p) => {
          const maxDirect = p.amount * p.direct_cap_multiplier;
          const maxBinary = p.amount * p.binary_cap_multiplier;
          return (
            <Card key={p.package_id} padding="none" className="overflow-hidden">
              <div className={cn(
                "px-5 py-4 border-b border-[var(--border)] flex items-center justify-between",
                p.status === "ACTIVE"
                  ? "bg-gradient-to-r from-emerald-50/70 via-white to-indigo-50/40"
                  : "bg-slate-50"
              )}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--text-primary)] truncate">{p.name}</h3>
                    <Badge status={p.status} />
                  </div>
                  <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">{p.package_id}</p>
                </div>
                <Button variant="secondary" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(p)}>Edit</Button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Price</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums leading-none mt-1">{formatINR(p.amount)}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 tabular-nums">{p.amount.toLocaleString()} paise</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[var(--border)] p-3.5 bg-white">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Max direct</p>
                    </div>
                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums mt-1">{formatINR(maxDirect)}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{p.direct_cap_multiplier}× price</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] p-3.5 bg-white">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Max binary</p>
                    </div>
                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums mt-1">{formatINR(maxBinary)}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{p.binary_cap_multiplier}× price</p>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/40 p-3.5">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">Daily binary cap</p>
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums mt-1">{formatINR(p.daily_binary_cap)} / day</p>
                  <p className="text-[11px] text-indigo-800/80 mt-0.5">Excess earned above cap is forfeited; BV carry-forward still applies.</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                  <Calendar className="w-3.5 h-3.5" />
                  Updated {formatDate(p.updated_at, false)} · sort #{p.sort_order}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {editing && (
        <ActionModal
          title={editing.isNew ? "New package" : `Edit · ${editing.draft.name}`}
          onClose={() => setEditing(null)}
          titleIcon={<PkgIcon className="w-5 h-5" />}
          footer={
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEditing}>{editing.isNew ? "Create package" : "Save changes"}</Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Package name"
              value={editing.draft.name}
              onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, name: e.target.value } })}
              required
            />
            <Select
              label="Status"
              value={editing.draft.status}
              onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, status: e.target.value as Draft["status"] } })}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "DISABLED", label: "Disabled" },
              ]}
            />
            <Input
              label="Price (INR)"
              type="number"
              step="0.01"
              hint="Amount in paise (demo UI)."
              value={editing.draft.amount_rupees}
              onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, amount_rupees: e.target.value } })}
              required
            />
            <Input
              label="Daily binary cap (INR)"
              type="number"
              step="0.01"
              hint="Excess above this is forfeited daily."
              value={editing.draft.daily_binary_cap_rupees}
              onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, daily_binary_cap_rupees: e.target.value } })}
              required
            />
            <Input
              label="Direct cap multiplier"
              type="number"
              hint="max_direct_cap = price × this"
              value={editing.draft.direct_cap_multiplier}
              onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, direct_cap_multiplier: e.target.value } })}
              required
            />
            <Input
              label="Binary cap multiplier"
              type="number"
              hint="max_binary_cap = price × this"
              value={editing.draft.binary_cap_multiplier}
              onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, binary_cap_multiplier: e.target.value } })}
              required
            />
            <Input
              label="Sort order"
              type="number"
              value={editing.draft.sort_order}
              onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, sort_order: e.target.value } })}
            />
          </div>
        </ActionModal>
      )}
    </div>
  );
}
