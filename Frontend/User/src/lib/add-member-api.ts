import { ApiError, apiJson, unwrapData, type ApiEnvelope } from '@/lib/api-client';

export interface AddMemberOTPSendResult {
  sent: boolean;
  dev_otp?: string;
}

export interface AddMemberOTPVerifyResult {
  verification_token: string;
  expires_in_sec: number;
}

export interface CreatedMemberUser {
  user_id: string;
  sponsor_id: string;
  full_name: string;
  email: string;
  phone?: string;
  status?: string;
}

export interface CreateDashboardMemberInput {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  leg: 'LEFT' | 'RIGHT';
}

function mapAddMemberApiError(status: number, message: string): string {
  if (status === 404 && message.includes('Cannot POST')) {
    return 'Add-member API is not available — restart the backend with add-member routes enabled, then try again.';
  }
  if (status === 503) {
    return message.includes('unavailable')
      ? message
      : 'Verification is temporarily unavailable. Ensure Redis is running, or set LOG_ADD_MEMBER_OTP=true in the API environment.';
  }
  return message;
}

async function withAddMemberErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) {
      throw new ApiError(e.status, mapAddMemberApiError(e.status, e.message));
    }
    throw e;
  }
}

function toE164Phone(countryCode: string, local: string): string {
  const digits = local.replace(/\D/g, '');
  const cc = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  return `${cc}${digits}`;
}

export function formatMemberPhone(
  countryCode: string,
  local: string,
): string {
  return toE164Phone(countryCode, local);
}

export async function sendAddMemberEmailOtp(
  email: string,
): Promise<AddMemberOTPSendResult> {
  return withAddMemberErrors(async () => {
    const envelope = await apiJson<ApiEnvelope<AddMemberOTPSendResult>>(
      '/api/v1/add-member/email/send',
      { method: 'POST', body: { email: email.trim() } },
    );
    return unwrapData(envelope);
  });
}

export async function verifyAddMemberEmailOtp(
  email: string,
  code: string,
): Promise<AddMemberOTPVerifyResult> {
  return withAddMemberErrors(async () => {
    const envelope = await apiJson<ApiEnvelope<AddMemberOTPVerifyResult>>(
      '/api/v1/add-member/email/verify',
      { method: 'POST', body: { email: email.trim(), code: code.trim() } },
    );
    return unwrapData(envelope);
  });
}

export async function sendAddMemberPhoneOtp(
  countryCode: string,
  local: string,
): Promise<AddMemberOTPSendResult> {
  return withAddMemberErrors(async () => {
    const phone = toE164Phone(countryCode, local);
    const envelope = await apiJson<ApiEnvelope<AddMemberOTPSendResult>>(
      '/api/v1/add-member/phone/send',
      { method: 'POST', body: { phone } },
    );
    return unwrapData(envelope);
  });
}

export async function verifyAddMemberPhoneOtp(
  countryCode: string,
  local: string,
  code: string,
): Promise<AddMemberOTPVerifyResult> {
  return withAddMemberErrors(async () => {
    const phone = toE164Phone(countryCode, local);
    const envelope = await apiJson<ApiEnvelope<AddMemberOTPVerifyResult>>(
      '/api/v1/add-member/phone/verify',
      { method: 'POST', body: { phone, code: code.trim() } },
    );
    return unwrapData(envelope);
  });
}

export async function createDashboardMember(
  input: CreateDashboardMemberInput,
): Promise<CreatedMemberUser> {
  return withAddMemberErrors(async () => {
    const envelope = await apiJson<ApiEnvelope<Record<string, unknown>>>(
      '/api/v1/users/create',
      {
        method: 'POST',
        body: {
          full_name: input.full_name.trim(),
          email: input.email.trim(),
          phone: input.phone,
          password: input.password,
          leg: input.leg,
        },
      },
    );
    const raw = unwrapData(envelope);
    return {
      user_id: String(raw.user_id ?? ''),
      sponsor_id: String(raw.sponsor_id ?? ''),
      full_name: String(raw.full_name ?? input.full_name),
      email: String(raw.email ?? input.email),
      phone: raw.phone != null ? String(raw.phone) : input.phone,
      status: raw.status != null ? String(raw.status) : undefined,
    };
  });
}
