"use client";
import React, { useMemo, useState } from "react";
import {
  Megaphone,
  Images,
  ClipboardList,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DASHBOARD_SLIDER_IMAGES_INITIAL,
  DASHBOARD_NOTICES_INITIAL,
  type DashboardSliderImage,
  type DashboardNotice,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type SectionId = "slider" | "notices";

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function NotificationCenterPage() {
  const [section, setSection] = useState<SectionId>("slider");
  const [slides, setSlides] = useState<DashboardSliderImage[]>(DASHBOARD_SLIDER_IMAGES_INITIAL);
  const [notices, setNotices] = useState<DashboardNotice[]>(DASHBOARD_NOTICES_INITIAL);

  const sortedSlides = useMemo(
    () => [...slides].sort((a, b) => a.sort_order - b.sort_order),
    [slides],
  );

  const addSlide = () => {
    if (slides.length >= 5) return;
    const nextOrder = slides.length ? Math.max(...slides.map((s) => s.sort_order)) + 1 : 0;
    setSlides((prev) => [
      ...prev,
      { id: newId("slide"), image_url: "", caption: "", sort_order: nextOrder },
    ]);
  };

  const patchSlide = (id: string, patch: Partial<DashboardSliderImage>) =>
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const removeSlide = (id: string) => setSlides((prev) => prev.filter((s) => s.id !== id));

  const moveSlide = (id: string, dir: -1 | 1) => {
    const list = [...sortedSlides];
    const i = list.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setSlides(list.map((s, idx) => ({ ...s, sort_order: idx })));
  };

  const addNotice = () => {
    setNotices((prev) => [
      {
        id: newId("notice"),
        title: "",
        body: "",
        link_url: null,
        link_label: null,
        active: true,
        updated_at: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const patchNotice = (id: string, patch: Partial<DashboardNotice>) =>
    setNotices((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n)),
    );

  const removeNotice = (id: string) => setNotices((prev) => prev.filter((n) => n.id !== id));

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md text-white">
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Notification center</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage the networker app home: up to five hero images and dashboard notices with optional links.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)]">
        {([
          { id: "slider" as const, label: "Image slider", icon: Images, desc: "Up to 5 images shown in rotation on the networker dashboard." },
          { id: "notices" as const, label: "Notice board", icon: ClipboardList, desc: "Notices every networker sees on the dashboard; optional link." },
        ]).map((t) => {
          const Icon = t.icon;
          const active = section === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSection(t.id)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors",
                active
                  ? "border-[var(--primary-600)] text-[var(--primary-600)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        {section === "slider"
          ? "Up to 5 images shown in rotation on the networker dashboard."
          : "Notices every networker sees on the dashboard; optional link."}
      </p>

      {section === "slider" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-secondary)]">
              {slides.length}/5 images · order is shown left-to-right on the dashboard carousel.
            </p>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={addSlide} disabled={slides.length >= 5}>
              Add image
            </Button>
          </div>

          <div className="space-y-3">
            {sortedSlides.map((s, idx) => (
              <Card key={s.id} padding="md" className="border-slate-200/90">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="w-full lg:w-48 shrink-0 aspect-[16/9] rounded-lg border border-slate-200 bg-slate-100 overflow-hidden">
                    {s.image_url ? (
                      <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Preview</div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <Input
                      label="Image URL"
                      placeholder="https://…"
                      value={s.image_url}
                      onChange={(e) => patchSlide(s.id, { image_url: e.target.value })}
                    />
                    <Input
                      label="Caption (optional)"
                      placeholder="Short line under the image"
                      value={s.caption}
                      onChange={(e) => patchSlide(s.id, { caption: e.target.value })}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" icon={<ChevronUp className="w-4 h-4" />} disabled={idx === 0} onClick={() => moveSlide(s.id, -1)}>
                        Up
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ChevronDown className="w-4 h-4" />}
                        disabled={idx === sortedSlides.length - 1}
                        onClick={() => moveSlide(s.id, 1)}
                      >
                        Down
                      </Button>
                      <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => removeSlide(s.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {slides.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-12 border border-dashed rounded-xl">No slides yet. Add up to five images.</p>
            )}
          </div>
        </div>
      )}

      {section === "notices" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={addNotice}>
              Add notice
            </Button>
          </div>

          <div className="space-y-4">
            {notices.map((n) => (
              <Card key={n.id} padding="md" className="border-slate-200/90">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={n.active}
                      onChange={(e) => patchNotice(n.id, { active: e.target.checked })}
                    />
                    <span className="text-sm font-semibold text-slate-800">Show on dashboard</span>
                  </label>
                  <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => removeNotice(n.id)}>
                    Delete
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input label="Title" value={n.title} onChange={(e) => patchNotice(n.id, { title: e.target.value })} />
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Message</label>
                    <textarea
                      className="w-full min-h-[88px] px-4 py-2.5 rounded-[10px] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/20 focus:border-[var(--primary-500)]"
                      value={n.body}
                      onChange={(e) => patchNotice(n.id, { body: e.target.value })}
                      placeholder="Shown to all networkers on their dashboard…"
                    />
                  </div>
                  <Input
                    label="Link URL (optional)"
                    placeholder="https://…"
                    value={n.link_url ?? ""}
                    onChange={(e) => patchNotice(n.id, { link_url: e.target.value.trim() || null })}
                  />
                  <Input
                    label="Link label (optional)"
                    placeholder="e.g. Read more"
                    value={n.link_label ?? ""}
                    onChange={(e) => patchNotice(n.id, { link_label: e.target.value.trim() || null })}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
