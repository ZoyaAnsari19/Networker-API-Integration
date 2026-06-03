import {
  apiJson,
  apiRequest,
  unwrapData,
  type ApiEnvelope,
} from '@/lib/api-client';
import type {
  KYCDocument,
  KYCDocumentType,
  KYCRequest,
  UserProfile,
} from '@/lib/profile-types';
import {
  normalizeKYCRequest,
  normalizeKYCDocument,
  normalizeUserProfile,
} from '@/lib/profile-types';

interface ApiAuthUser {
  user_id: string;
  sponsor_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  status: string;
  role: string;
}

export interface LoginResult {
  user: ApiAuthUser;
  access_token: string;
  refresh_token: string;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResult> {
  const envelope = await apiJson<ApiEnvelope<LoginResult>>('/api/v1/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
  return unwrapData(envelope);
}

export async function fetchMyProfile(): Promise<UserProfile> {
  const envelope = await apiJson<ApiEnvelope<Record<string, unknown>>>('/api/v1/me');
  return normalizeUserProfile(unwrapData(envelope));
}

export async function fetchMyKYC(): Promise<KYCRequest | null> {
  const envelope = await apiJson<
    ApiEnvelope<{ request: Record<string, unknown> | null }>
  >('/api/v1/kyc/me');
  const request = unwrapData(envelope).request;
  return request
    ? normalizeKYCRequest(
        request as Parameters<typeof normalizeKYCRequest>[0],
      )
    : null;
}

export async function changePasswordRequest(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiJson('/api/v1/me/password', {
    method: 'POST',
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

export async function setTransactionPasswordRequest(input: {
  loginPassword: string;
  currentTransactionPassword?: string;
  newTransactionPassword: string;
}): Promise<void> {
  await apiJson('/api/v1/me/transaction-password', {
    method: 'POST',
    body: {
      login_password: input.loginPassword,
      ...(input.currentTransactionPassword
        ? { current_transaction_password: input.currentTransactionPassword }
        : {}),
      new_transaction_password: input.newTransactionPassword,
    },
  });
}

export async function updateEmailRequest(input: {
  newEmail: string;
  loginPassword: string;
  otpVerified: boolean;
}): Promise<void> {
  await apiJson('/api/v1/me/email', {
    method: 'POST',
    body: {
      new_email: input.newEmail,
      login_password: input.loginPassword,
      otp_verified: input.otpVerified,
    },
  });
}

export async function updatePhoneRequest(input: {
  newPhone: string;
  loginPassword: string;
  otpVerified: boolean;
}): Promise<void> {
  await apiJson('/api/v1/me/phone', {
    method: 'POST',
    body: {
      new_phone: input.newPhone,
      login_password: input.loginPassword,
      otp_verified: input.otpVerified,
    },
  });
}

export async function uploadAvatarRequest(file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiRequest('/api/v1/me/avatar', {
    method: 'POST',
    body: form,
  });
  const parsed = (await res.json()) as ApiEnvelope;
  if (!res.ok || parsed.success === false) {
    throw new Error(parsed.error || parsed.message || 'Avatar upload failed');
  }
}

export async function updatePayoutUPIRequest(input: {
  payoutUPIId: string;
  loginPassword: string;
}): Promise<void> {
  await apiJson('/api/v1/me/payout-upi', {
    method: 'POST',
    body: {
      payout_upi_id: input.payoutUPIId,
      login_password: input.loginPassword,
    },
  });
}

export async function uploadKYCDocumentRequest(
  documentType: KYCDocumentType,
  file: File,
): Promise<KYCDocument> {
  const form = new FormData();
  form.append('document_type', documentType);
  form.append('file', file);
  const res = await apiRequest('/api/v1/kyc/documents', {
    method: 'POST',
    body: form,
  });
  const parsed = (await res.json()) as ApiEnvelope<Record<string, unknown>>;
  if (!res.ok || parsed.success === false) {
    throw new Error(parsed.error || parsed.message || 'KYC upload failed');
  }
  return normalizeKYCDocument(
    unwrapData(parsed) as Parameters<typeof normalizeKYCDocument>[0],
  );
}

export async function submitKYCRequest(): Promise<void> {
  await apiJson('/api/v1/kyc/submit', { method: 'POST', body: {} });
}
