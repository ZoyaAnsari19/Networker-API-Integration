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
  return unwrapData(env);
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
  return unwrapData(env);
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
  return unwrapData(env);
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
  status: string;
  page: number;
  limit: number;
}): Promise<{ data: AdminPayoutRow[]; total: number; totalPages: number }> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
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

