import { apiJson, apiPaginated, unwrapData, type ApiEnvelope } from "@/lib/api-client";

export type PackageStatus = "ACTIVE" | "DISABLED";

export interface AdminPackage {
  package_id: string;
  name: string;
  amount: number; // paise
  daily_binary_cap: number; // paise/day
  status: PackageStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function listPackages(): Promise<AdminPackage[]> {
  const env = await apiJson<ApiEnvelope<AdminPackage[]>>(
    "/api/v1/admin/config/packages",
  );
  return unwrapData(env) ?? [];
}

export async function createPackage(input: {
  name: string;
  amount: number;
  daily_binary_cap: number;
  sort_order: number;
}): Promise<AdminPackage> {
  const env = await apiJson<ApiEnvelope<AdminPackage>>(
    "/api/v1/admin/config/packages",
    { method: "POST", body: input },
  );
  return unwrapData(env);
}

export async function updatePackage(
  id: string,
  patch: Partial<{
    name: string;
    amount: number;
    daily_binary_cap: number;
    status: PackageStatus;
    sort_order: number;
  }>,
): Promise<void> {
  await apiJson<ApiEnvelope<null>>(`/api/v1/admin/config/packages/${id}`, {
    method: "PUT",
    body: patch,
  });
}

export interface CommissionConfigRow {
  id: number;
  config_key: string;
  config_value: unknown; // {"value": ...}
  updated_by?: string | null;
  updated_at: string;
}

export interface PayoutConfigRow {
  id: number;
  config_key: string;
  config_value: unknown; // {"value": ...} or richer
  updated_at: string;
}

export async function listCommissionConfigs(): Promise<CommissionConfigRow[]> {
  const env = await apiJson<ApiEnvelope<CommissionConfigRow[]>>(
    "/api/v1/admin/config/commissions",
  );
  return unwrapData(env) ?? [];
}

export async function updateCommissionConfig(
  key: string,
  configValue: unknown,
): Promise<void> {
  await apiJson<ApiEnvelope<null>>("/api/v1/admin/config/commissions", {
    method: "PUT",
    body: {
      config_key: key,
      config_value: configValue,
    },
  });
}

export async function listPayoutConfigs(): Promise<PayoutConfigRow[]> {
  const env = await apiJson<ApiEnvelope<PayoutConfigRow[]>>(
    "/api/v1/admin/config/payout",
  );
  return unwrapData(env) ?? [];
}

export async function updatePayoutConfig(
  key: string,
  configValue: unknown,
): Promise<void> {
  await apiJson<ApiEnvelope<null>>("/api/v1/admin/config/payout", {
    method: "PUT",
    body: {
      config_key: key,
      config_value: configValue,
    },
  });
}

export interface AdminUserRow {
  user_id: string;
  sponsor_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  status: string;
  role: string;
  current_package_id?: string | null;
  monthly_income_paise: number;
  monthly_shopping_paise: number;
  income_period_ym: number;
  today_binary_earned: number;
  daily_binary_cap: number;
  placement_status: string;
  created_at: string;
  updated_at: string;
  secure_wallet_external_id?: string | null;
  secure_wallet_balance_paise?: number | null;
}

export async function listUsers(params: {
  status?: string;
  page: number;
  limit: number;
}): Promise<{ data: AdminUserRow[]; total: number; totalPages: number }> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page));
  qs.set("limit", String(params.limit));
  const res = await apiPaginated<AdminUserRow[]>(
    `/api/v1/admin/users?${qs.toString()}`,
  );
  return {
    data: res.data,
    total: res.meta.total,
    totalPages: res.meta.total_pages,
  };
}

export interface AdminPayoutRow {
  payout_id: string;
  user_id: string;
  wallet_type: string;
  requested_amount: number;
  approved_amount?: number | null;
  status: string;
  admin_note?: string | null;
  sc_tx_reference?: string | null;
  sc_user_email?: string | null;
  requested_at: string;
  processed_at?: string | null;
}

export async function listPayouts(params: {
  /** Omit = backend default (PENDING). Pass `""` for all statuses. */
  status?: string;
  page: number;
  limit: number;
}): Promise<{ data: AdminPayoutRow[]; total: number; totalPages: number }> {
  const qs = new URLSearchParams();
  if (params.status !== undefined) qs.set("status", params.status);
  qs.set("page", String(params.page));
  qs.set("limit", String(params.limit));
  const res = await apiPaginated<AdminPayoutRow[]>(
    `/api/v1/admin/payouts?${qs.toString()}`,
  );
  return {
    data: res.data,
    total: res.meta.total,
    totalPages: res.meta.total_pages,
  };
}

export async function approvePayout(
  id: string,
  input: { amount?: number; admin_note?: string } = {},
): Promise<void> {
  await apiJson<ApiEnvelope<null>>(`/api/v1/admin/payouts/${id}/approve`, {
    method: "POST",
    body: input,
  });
}

export async function rejectPayout(
  id: string,
  input: { admin_note: string },
): Promise<void> {
  await apiJson<ApiEnvelope<null>>(`/api/v1/admin/payouts/${id}/reject`, {
    method: "POST",
    body: input,
  });
}

export interface KYCDocument {
  document_id: string;
  kyc_id: string;
  document_type: string;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  download_url?: string | null;
  uploaded_at: string;
}

export interface KYCRequest {
  kyc_id: string;
  user_id: string;
  status: string;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  documents?: KYCDocument[];
}

export async function listKycRequests(params: {
  status?: string;
  page: number;
  limit: number;
}): Promise<{ data: KYCRequest[]; total: number; totalPages: number }> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page));
  qs.set("limit", String(params.limit));
  const res = await apiPaginated<KYCRequest[]>(
    `/api/v1/admin/kyc/requests?${qs.toString()}`,
  );
  return {
    data: res.data,
    total: res.meta.total,
    totalPages: res.meta.total_pages,
  };
}

export async function getKycRequest(kycId: string): Promise<KYCRequest> {
  const env = await apiJson<ApiEnvelope<KYCRequest>>(
    `/api/v1/admin/kyc/requests/${kycId}`,
  );
  return unwrapData(env);
}

export async function updateKycRequest(
  kycId: string,
  input: { status: "APPROVED" | "REJECTED"; rejection_reason?: string },
): Promise<void> {
  await apiJson<ApiEnvelope<null>>(`/api/v1/admin/kyc/requests/${kycId}`, {
    method: "PATCH",
    body: {
      status: input.status,
      rejection_reason:
        input.status === "REJECTED" ? input.rejection_reason : undefined,
    },
  });
}

export interface ApiLedgerEntry {
  id: number;
  user_id: string;
  wallet_type: string;
  amount: number;
  entry_type: string;
  source: string;
  reference_id?: string | null;
  reference_type?: string | null;
  description?: string | null;
  payer_name?: string | null;
  created_at: string;
}

export async function listWalletLedger(params: {
  walletType: "DIRECT" | "TEAM";
  page: number;
  limit: number;
}): Promise<{ data: ApiLedgerEntry[]; total: number; totalPages: number }> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  qs.set("limit", String(params.limit));
  const res = await apiPaginated<ApiLedgerEntry[]>(
    `/api/v1/wallets/${params.walletType}/ledger?${qs.toString()}`,
  );
  return {
    data: res.data,
    total: res.meta.total,
    totalPages: res.meta.total_pages,
  };
}

export async function getUser(userId: string): Promise<AdminUserRow> {
  const env = await apiJson<ApiEnvelope<AdminUserRow>>(
    `/api/v1/admin/users/${userId}`,
  );
  return unwrapData(env);
}

export async function updateUserStatus(
  userId: string,
  input: { status: "ACTIVE" | "INACTIVE" | "BLOCKED"; admin_note?: string },
): Promise<AdminUserRow> {
  const env = await apiJson<ApiEnvelope<AdminUserRow>>(
    `/api/v1/admin/users/${userId}`,
    { method: "PATCH", body: input },
  );
  return unwrapData(env);
}

export interface AdminUserWalletSummary {
  user_id: string;
  sponsor_id: string;
  direct_balance: number;
  team_balance: number;
  total_balance: number;
}

export async function getUserWallets(
  userId: string,
): Promise<AdminUserWalletSummary> {
  const env = await apiJson<ApiEnvelope<AdminUserWalletSummary>>(
    `/api/v1/admin/users/${userId}/wallets`,
  );
  return unwrapData(env);
}

export async function getUserWalletLedger(params: {
  userId: string;
  walletType: "DIRECT" | "TEAM";
  page: number;
  limit: number;
}): Promise<{ data: ApiLedgerEntry[]; total: number; totalPages: number }> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  qs.set("limit", String(params.limit));
  const res = await apiPaginated<ApiLedgerEntry[]>(
    `/api/v1/admin/users/${params.userId}/wallets/${params.walletType}/ledger?${qs.toString()}`,
  );
  return {
    data: res.data,
    total: res.meta.total,
    totalPages: res.meta.total_pages,
  };
}

export interface AdminWalletAdjustResult {
  ledger_id: number;
  user_id: string;
  wallet_type: "DIRECT" | "TEAM";
  entry_type: "CREDIT" | "DEBIT";
  amount: number;
  direct_balance: number;
  team_balance: number;
  total_balance: number;
}

export async function adjustUserWallet(
  userId: string,
  input: {
    wallet_type: "DIRECT" | "TEAM";
    entry_type: "CREDIT" | "DEBIT";
    amount: number;
    reason: string;
    admin_note?: string;
  },
): Promise<AdminWalletAdjustResult> {
  const env = await apiJson<ApiEnvelope<AdminWalletAdjustResult>>(
    `/api/v1/admin/users/${userId}/wallet/adjust`,
    { method: "POST", body: input },
  );
  return unwrapData(env);
}

export type SupportTicketStatus = "open" | "in_progress" | "closed";

export interface SupportTopic {
  id: number;
  question: string;
  category?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupportAttachment {
  url: string;
  type: string;
  filename: string;
}

export interface SupportMessage {
  id: number;
  ticket_id: string;
  sender_type: "user" | "admin" | "system";
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

export async function listSupportTickets(params: {
  status?: string;
  assigned?: "me" | "unassigned";
  search?: string;
  page: number;
  limit: number;
}): Promise<{ data: SupportTicket[]; total: number; totalPages: number }> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.assigned) qs.set("assigned", params.assigned);
  if (params.search?.trim()) qs.set("search", params.search.trim());
  qs.set("page", String(params.page));
  qs.set("limit", String(params.limit));
  const res = await apiPaginated<SupportTicket[]>(
    `/api/v1/admin/support/tickets?${qs.toString()}`,
  );
  return {
    data: res.data,
    total: res.meta.total,
    totalPages: res.meta.total_pages,
  };
}

export async function getSupportTicket(id: string): Promise<SupportTicketDetail> {
  const env = await apiJson<ApiEnvelope<SupportTicketDetail>>(
    `/api/v1/admin/support/tickets/${id}`,
  );
  return unwrapData(env);
}

export async function assignSupportTicketToMe(id: string): Promise<SupportTicket> {
  const env = await apiJson<ApiEnvelope<SupportTicket>>(
    `/api/v1/admin/support/tickets/${id}/assign-to-me`,
    { method: "POST", body: {} },
  );
  return unwrapData(env);
}

export async function postAdminSupportMessage(
  id: string,
  message: string,
): Promise<SupportMessage> {
  const env = await apiJson<ApiEnvelope<SupportMessage>>(
    `/api/v1/admin/support/tickets/${id}/messages`,
    { method: "POST", body: { message } },
  );
  return unwrapData(env);
}

export async function closeSupportTicketAdmin(id: string): Promise<SupportTicket> {
  const env = await apiJson<ApiEnvelope<SupportTicket>>(
    `/api/v1/admin/support/tickets/${id}/close`,
    { method: "POST", body: {} },
  );
  return unwrapData(env);
}

export async function listSupportTopicsAdmin(): Promise<SupportTopic[]> {
  const env = await apiJson<ApiEnvelope<SupportTopic[]>>(
    "/api/v1/admin/support/topics",
  );
  return unwrapData(env) ?? [];
}

export async function createSupportTopic(input: {
  question: string;
  category?: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<SupportTopic> {
  const env = await apiJson<ApiEnvelope<SupportTopic>>(
    "/api/v1/admin/support/topics",
    { method: "POST", body: input },
  );
  return unwrapData(env);
}

export async function updateSupportTopic(
  id: number,
  patch: Partial<{
    question: string;
    category: string | null;
    sort_order: number;
    is_active: boolean;
  }>,
): Promise<SupportTopic> {
  const env = await apiJson<ApiEnvelope<SupportTopic>>(
    `/api/v1/admin/support/topics/${id}`,
    { method: "PUT", body: patch },
  );
  return unwrapData(env);
}

export async function deleteSupportTopic(id: number): Promise<void> {
  await apiJson<ApiEnvelope<null>>(`/api/v1/admin/support/topics/${id}`, {
    method: "DELETE",
  });
}

