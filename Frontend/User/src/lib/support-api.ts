import {
  apiJson,
  apiRequest,
  unwrapData,
  type ApiEnvelope,
} from '@/lib/api-client';

export type SupportTicketStatus = 'open' | 'in_progress' | 'closed';

export interface SupportTopic {
  id: number;
  question: string;
  category?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface SupportAttachment {
  url: string;
  type: string;
  filename: string;
}

export interface SupportMessage {
  id: number;
  ticket_id: string;
  sender_type: 'user' | 'admin' | 'system';
  sender_user_id?: string | null;
  sender_name?: string | null;
  message_text?: string | null;
  attachment_urls: SupportAttachment[];
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  user_full_name?: string | null;
  user_sponsor_id?: string | null;
  user_email?: string | null;
  pre_question_id?: number | null;
  pre_question?: string | null;
  subject?: string | null;
  status: SupportTicketStatus;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  closed_at?: string | null;
  last_message_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketDetail {
  ticket: SupportTicket;
  messages: SupportMessage[];
}

export async function listSupportTopics(): Promise<SupportTopic[]> {
  const env = await apiJson<ApiEnvelope<SupportTopic[]>>('/api/v1/me/support/topics');
  return unwrapData(env) ?? [];
}

export async function listMySupportTickets(
  status?: SupportTicketStatus,
): Promise<SupportTicket[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const env = await apiJson<ApiEnvelope<SupportTicket[]>>(
    `/api/v1/me/support/tickets${qs}`,
  );
  return unwrapData(env) ?? [];
}

export async function getMySupportTicket(id: string): Promise<SupportTicketDetail> {
  const env = await apiJson<ApiEnvelope<SupportTicketDetail>>(
    `/api/v1/me/support/tickets/${id}`,
  );
  return unwrapData(env);
}

export async function createSupportTicket(input: {
  pre_question_id?: number;
  subject?: string;
  message: string;
}): Promise<SupportTicketDetail> {
  const env = await apiJson<ApiEnvelope<SupportTicketDetail>>(
    '/api/v1/me/support/tickets',
    { method: 'POST', body: input },
  );
  return unwrapData(env);
}

export async function postSupportMessage(
  ticketId: string,
  message: string,
): Promise<SupportMessage> {
  const env = await apiJson<ApiEnvelope<SupportMessage>>(
    `/api/v1/me/support/tickets/${ticketId}/messages`,
    { method: 'POST', body: { message } },
  );
  return unwrapData(env);
}

export async function closeSupportTicket(ticketId: string): Promise<SupportTicket> {
  const env = await apiJson<ApiEnvelope<SupportTicket>>(
    `/api/v1/me/support/tickets/${ticketId}/close`,
    { method: 'POST', body: {} },
  );
  return unwrapData(env);
}

export async function uploadSupportAttachment(
  ticketId: string,
  file: File,
): Promise<SupportAttachment> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiRequest(`/api/v1/me/support/tickets/${ticketId}/attachments`, {
    method: 'POST',
    body: form,
  });
  const parsed = (await res.json()) as ApiEnvelope<SupportAttachment>;
  if (!res.ok || parsed.success === false) {
    throw new Error(parsed.error || parsed.message || 'Upload failed');
  }
  return unwrapData(parsed);
}
