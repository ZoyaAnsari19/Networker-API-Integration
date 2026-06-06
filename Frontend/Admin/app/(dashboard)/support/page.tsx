"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Headphones,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  UserCheck,
  Send,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionModal } from "@/components/modals/action-modal";
import { PAGE_SIZE } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import {
  assignSupportTicketToMe,
  closeSupportTicketAdmin,
  createSupportTopic,
  deleteSupportTopic,
  getSupportTicket,
  listSupportTickets,
  listSupportTopicsAdmin,
  postAdminSupportMessage,
  updateSupportTopic,
  type SupportMessage,
  type SupportTicket,
  type SupportTicketDetail,
  type SupportTopic,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api-client";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Closed" },
];

const ASSIGNED_OPTIONS = [
  { value: "", label: "All tickets" },
  { value: "me", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" },
];

function statusLabel(s: string) {
  if (s === "in_progress") return "In progress";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function senderLabel(msg: SupportMessage) {
  if (msg.sender_type === "system") return "System";
  if (msg.sender_type === "user") return msg.sender_name ?? "Networker";
  return msg.sender_name ?? "Support";
}

function TicketDetailModal({
  ticketId,
  onClose,
  onUpdated,
}: {
  ticketId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { user } = useAdminAuthStore();
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await getSupportTicket(ticketId));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load ticket",
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const t = detail?.ticket;
  const isAdmin = user?.role === "ADMIN";
  const isAssignedToMe = !!user?.id && t?.assigned_to === user.id;
  const canReply = isAssignedToMe && t?.status !== "closed";
  const canAssign = t?.status !== "closed" && !isAssignedToMe;
  const canClose =
    t?.status !== "closed" && (isAdmin || isAssignedToMe);

  const runAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    setError(null);
    try {
      await fn();
      await load();
      onUpdated();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Action failed",
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ActionModal
      title={t?.subject ?? t?.pre_question ?? "Support ticket"}
      onClose={onClose}
      maxWidth="max-w-2xl"
      titleIcon={<Headphones className="w-5 h-5" />}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading ticket…</span>
        </div>
      ) : !detail ? (
        <p className="text-sm text-rose-600 py-8 text-center">{error ?? "Not found"}</p>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500">Networker</p>
              <p className="font-semibold text-slate-900">
                {t?.user_full_name ?? "—"}
              </p>
              <p className="text-xs text-slate-500">{t?.user_email}</p>
            </div>
            <div>
              <p className="text-slate-500">SPF / Status</p>
              <p className="font-mono font-medium">{t?.user_sponsor_id ?? "—"}</p>
              <Badge status={t?.status ?? "open"} className="mt-1" />
            </div>
            <div>
              <p className="text-slate-500">Assigned to</p>
              <p className="font-medium">{t?.assigned_to_name ?? "Unassigned"}</p>
            </div>
            <div>
              <p className="text-slate-500">Created</p>
              <p className="font-medium">{formatDate(t!.created_at)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canAssign && (
              <Button
                size="sm"
                variant="secondary"
                icon={<UserCheck className="w-3.5 h-3.5" />}
                loading={actionLoading}
                onClick={() =>
                  void runAction(async () => {
                    await assignSupportTicketToMe(ticketId);
                  })
                }
              >
                Assign to me
              </Button>
            )}
            {canClose && (
              <Button
                size="sm"
                variant="ghost"
                icon={<XCircle className="w-3.5 h-3.5" />}
                loading={actionLoading}
                onClick={() => {
                  if (!window.confirm("Close this ticket?")) return;
                  void runAction(async () => {
                    await closeSupportTicketAdmin(ticketId);
                  });
                }}
              >
                Close ticket
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 max-h-72 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
            {detail.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm border",
                  msg.sender_type === "admin"
                    ? "bg-indigo-50 border-indigo-100 ml-4"
                    : msg.sender_type === "user"
                      ? "bg-white border-slate-200 mr-4"
                      : "bg-slate-100 border-dashed border-slate-200 text-slate-600 text-xs italic",
                )}
              >
                {msg.message_text && (
                  <p className="whitespace-pre-wrap text-slate-800">{msg.message_text}</p>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  {senderLabel(msg)} · {formatDate(msg.created_at)}
                </p>
              </div>
            ))}
          </div>

          {canReply && (
            <div className="flex gap-2">
              <Input
                placeholder="Reply to networker…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                icon={<Send className="w-3.5 h-3.5" />}
                loading={actionLoading}
                disabled={!reply.trim()}
                onClick={() =>
                  void runAction(async () => {
                    await postAdminSupportMessage(ticketId, reply.trim());
                    setReply("");
                  })
                }
              >
                Send
              </Button>
            </div>
          )}
          {t?.status !== "closed" && !isAssignedToMe && (
            <p className="text-xs text-slate-500">
              Assign this ticket to yourself before replying.
            </p>
          )}
        </div>
      )}
    </ActionModal>
  );
}

export default function SupportPage() {
  const [tab, setTab] = useState<"tickets" | "topics">("tickets");

  const [rows, setRows] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [topics, setTopics] = useState<SupportTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [topicSaving, setTopicSaving] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listSupportTickets({
        status: statusFilter || undefined,
        assigned: (assignedFilter as "me" | "unassigned") || undefined,
        search: search.trim() || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setRows(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load tickets",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, assignedFilter, search]);

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      setTopics(await listSupportTopicsAdmin());
    } catch {
      setTopics([]);
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "tickets") void loadTickets();
  }, [tab, loadTickets]);

  useEffect(() => {
    if (tab === "topics") void loadTopics();
  }, [tab, loadTopics]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, assignedFilter]);

  const hasFilters = !!search.trim() || !!statusFilter || !!assignedFilter;

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    setTopicSaving(true);
    try {
      await createSupportTopic({ question: newTopic.trim(), sort_order: topics.length });
      setNewTopic("");
      await loadTopics();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to create topic",
      );
    } finally {
      setTopicSaving(false);
    }
  };

  const toggleTopic = async (topic: SupportTopic) => {
    try {
      await updateSupportTopic(topic.id, { is_active: !topic.is_active });
      await loadTopics();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update topic",
      );
    }
  };

  const removeTopic = async (id: number) => {
    if (!window.confirm("Delete this topic?")) return;
    try {
      await deleteSupportTopic(id);
      await loadTopics();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to delete topic",
      );
    }
  };

  const pageLabel = useMemo(
    () => `${total} ticket${total === 1 ? "" : "s"}`,
    [total],
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md text-white">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Support
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Manage networker support tickets and topic presets.
            </p>
          </div>
        </div>
        {tab === "tickets" && (
          <p className="text-xs text-[var(--text-muted)] tabular-nums">{pageLabel}</p>
        )}
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/80 max-w-md">
        {(
          [
            { id: "tickets" as const, label: "Tickets" },
            { id: "topics" as const, label: "Topics" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
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
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {tab === "tickets" ? (
        <>
          <Card padding="md">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Input
                  placeholder="Search subject, networker, SPF, email…"
                  icon={<Search className="w-4 h-4" />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
              <Select
                options={ASSIGNED_OPTIONS}
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
              />
            </div>
            {hasFilters && (
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setAssignedFilter("");
                  }}
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
                <span className="text-sm">Loading tickets…</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-slate-50/95">
                        <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                          Subject
                        </th>
                        <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                          Networker
                        </th>
                        <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                          Status
                        </th>
                        <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                          Assigned
                        </th>
                        <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                          Updated
                        </th>
                        <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/80">
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              {row.subject ?? row.pre_question ?? "—"}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium">{row.user_full_name}</p>
                            <p className="text-xs text-[var(--text-muted)] font-mono">
                              {row.user_sponsor_id}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <Badge status={row.status} />
                          </td>
                          <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                            {row.assigned_to_name ?? "—"}
                          </td>
                          <td className="px-5 py-4 text-xs text-[var(--text-muted)] whitespace-nowrap">
                            {formatDate(row.last_message_at ?? row.updated_at)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => setDetailId(row.id)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-16 text-center text-sm text-[var(--text-muted)]"
                          >
                            No tickets match these filters.
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
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      icon={<ChevronLeft className="w-3.5 h-3.5" />}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages}
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
        </>
      ) : (
        <Card padding="md">
          <form onSubmit={(e) => void handleAddTopic(e)} className="flex gap-2 mb-6">
            <Input
              placeholder="New topic question…"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" loading={topicSaving} icon={<Plus className="w-4 h-4" />}>
              Add
            </Button>
          </form>
          {topicsLoading ? (
            <div className="flex items-center gap-2 py-8 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading topics…</span>
            </div>
          ) : topics.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-8 text-center">
              No topics yet. Add one for the networker new-ticket form.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {topics.map((topic) => (
                <li
                  key={topic.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {topic.question}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Order {topic.sort_order}
                      {topic.category ? ` · ${topic.category}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void toggleTopic(topic)}
                    >
                      {topic.is_active ? "Active" : "Inactive"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => void removeTopic(topic.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {detailId && (
        <TicketDetailModal
          ticketId={detailId}
          onClose={() => setDetailId(null)}
          onUpdated={() => void loadTickets()}
        />
      )}
    </div>
  );
}
