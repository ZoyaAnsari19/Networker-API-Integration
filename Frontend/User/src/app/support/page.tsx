'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Headphones,
  Plus,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RelativeTime } from '@/components/ui/relative-time';
import { ApiError } from '@/lib/api-client';
import {
  closeSupportTicket,
  createSupportTicket,
  getMySupportTicket,
  listMySupportTickets,
  listSupportTopics,
  postSupportMessage,
  type SupportMessage,
  type SupportTicket,
  type SupportTicketDetail,
  type SupportTopic,
} from '@/lib/support-api';

function statusLabel(status: string) {
  if (status === 'in_progress') return 'In progress';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'open') return <AlertCircle className="h-4 w-4 text-accent-red" />;
  if (status === 'in_progress') return <Clock className="h-4 w-4 text-accent-gold" />;
  if (status === 'closed') return <CheckCircle2 className="h-4 w-4 text-text-muted" />;
  return <AlertCircle className="h-4 w-4 text-text-muted" />;
}

function badgeVariant(status: string): 'danger' | 'warning' | 'success' | 'outline' {
  if (status === 'open') return 'danger';
  if (status === 'in_progress') return 'warning';
  if (status === 'closed') return 'outline';
  return 'outline';
}

function senderLabel(msg: SupportMessage) {
  if (msg.sender_type === 'system') return 'System';
  if (msg.sender_type === 'admin') return msg.sender_name ?? 'Support';
  return 'You';
}

export default function SupportPage() {
  const [topics, setTopics] = useState<SupportTopic[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showNewTicket, setShowNewTicket] = useState(false);
  const [topicId, setTopicId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [topicList, ticketList] = await Promise.all([
        listSupportTopics(),
        listMySupportTickets(),
      ]);
      setTopics(topicList);
      setTickets(ticketList);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load support',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openTicket = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    setActionError(null);
    try {
      const d = await getMySupportTicket(id);
      setDetail(d);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load ticket',
      );
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const created = await createSupportTicket({
        pre_question_id: topicId ? Number(topicId) : undefined,
        subject: subject.trim() || undefined,
        message: message.trim(),
      });
      setShowNewTicket(false);
      setTopicId('');
      setSubject('');
      setMessage('');
      await load();
      setExpandedId(created.ticket.id);
      setDetail(created);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create ticket',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (ticketId: string) => {
    if (!reply.trim()) return;
    setReplyLoading(true);
    setActionError(null);
    try {
      await postSupportMessage(ticketId, reply.trim());
      setReply('');
      const d = await getMySupportTicket(ticketId);
      setDetail(d);
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to send reply',
      );
    } finally {
      setReplyLoading(false);
    }
  };

  const handleClose = async (ticketId: string) => {
    if (!window.confirm('Close this ticket?')) return;
    setActionError(null);
    try {
      await closeSupportTicket(ticketId);
      const d = await getMySupportTicket(ticketId);
      setDetail(d);
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to close ticket',
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-secondary/20 to-accent-blue/20 p-6 border border-secondary/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/20">
              <Headphones className="h-7 w-7 text-secondary-light" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Support Center</h2>
              <p className="text-text-secondary mt-1">
                Raise a ticket and our team will respond here.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowNewTicket(!showNewTicket)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionError}
        </div>
      )}

      {showNewTicket && (
        <Card className="p-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg">Create New Ticket</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Topic
                </label>
                <Select value={topicId} onValueChange={setTopicId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.question}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                label="Subject"
                placeholder="Brief description of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Message
                </label>
                <Textarea
                  placeholder="Describe your issue in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowNewTicket(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit Ticket
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="p-0">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">My Tickets</CardTitle>
            <Badge variant="outline">{tickets.length} tickets</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading tickets…</span>
            </div>
          ) : tickets.length === 0 ? (
            <p className="py-16 text-center text-sm text-text-muted">
              No tickets yet. Create one if you need help.
            </p>
          ) : (
            <div className="divide-y divide-card-border">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-6 hover:bg-card-hover/50 transition-colors cursor-pointer"
                  onClick={() => void openTicket(ticket.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card-hover">
                        <StatusIcon status={ticket.status} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {ticket.subject ?? ticket.pre_question ?? 'Support ticket'}
                        </p>
                        <p className="text-sm text-text-muted mt-1">
                          <RelativeTime value={ticket.created_at} /> · #{ticket.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={badgeVariant(ticket.status)} size="sm">
                        {statusLabel(ticket.status)}
                      </Badge>
                      {expandedId === ticket.id ? (
                        <ChevronUp className="h-4 w-4 text-text-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-text-muted" />
                      )}
                    </div>
                  </div>

                  {expandedId === ticket.id && (
                    <div
                      className="mt-4 pt-4 border-t border-card-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {detailLoading || !detail ? (
                        <div className="flex items-center gap-2 py-6 text-text-muted">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Loading conversation…</span>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {detail.messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${
                                  msg.sender_type === 'user' ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`max-w-[85%] p-3 rounded-xl ${
                                    msg.sender_type === 'user'
                                      ? 'bg-primary/10 border border-primary/30'
                                      : msg.sender_type === 'system'
                                        ? 'bg-card-hover/60 border border-dashed border-card-border'
                                        : 'bg-card-hover border border-card-border'
                                  }`}
                                >
                                  {msg.message_text && (
                                    <p className="text-sm text-text-primary whitespace-pre-wrap">
                                      {msg.message_text}
                                    </p>
                                  )}
                                  {msg.attachment_urls?.length > 0 && (
                                    <ul className="mt-2 space-y-1">
                                      {msg.attachment_urls.map((a, i) => (
                                        <li key={i}>
                                          <a
                                            href={a.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary underline"
                                          >
                                            {a.filename}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  <p className="text-xs text-text-muted mt-1">
                                    {senderLabel(msg)} ·{' '}
                                    <RelativeTime value={msg.created_at} />
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {detail.ticket.status !== 'closed' && (
                            <div className="mt-4 flex flex-col sm:flex-row gap-2">
                              <Input
                                placeholder="Type your reply…"
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                className="gap-2 shrink-0"
                                disabled={replyLoading || !reply.trim()}
                                onClick={() => void handleReply(ticket.id)}
                              >
                                {replyLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                                Send
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 shrink-0"
                                onClick={() => void handleClose(ticket.id)}
                              >
                                <XCircle className="h-4 w-4" />
                                Close
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
