export type KYCStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type KYCDocumentType =
  | 'PAN_CARD'
  | 'AADHAAR_FRONT'
  | 'AADHAAR_BACK'
  | 'BANK_PASSBOOK'
  | 'OTHER';

export interface UserProfile {
  user_id: string;
  sponsor_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  role: string;
  current_package_id: string | null;
  package_activated_at: string | null;
  monthly_income_paise: number;
  monthly_shopping_paise: number;
  income_period_ym: number;
  today_binary_earned: number;
  daily_binary_cap: number;
  placement_status: string;
  created_at: string;
  updated_at: string;
  package_name: string | null;
  package_amount: number | null;
  direct_wallet_balance: number;
  team_wallet_balance: number;
  direct_referral_count: number;
  sponsor_name: string | null;
  sponsor_sponsor_id: string | null;
  has_transaction_password: boolean;
  kyc_status: KYCStatus | null;
  kyc_rejection_reason: string | null;
  avatar_url?: string | null;
  payout_upi_id?: string | null;
  payout_bank_display?: string | null;
  secure_wallet_external_id?: string | null;
  secure_wallet_balance_paise?: number | null;
}

export interface KYCDocument {
  document_id: string;
  kyc_id: string;
  document_type: KYCDocumentType;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface KYCRequest {
  kyc_id: string;
  user_id: string;
  status: KYCStatus;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  documents: KYCDocument[];
}

/** Normalize nullable API KYC document fields for the UI. */
export function normalizeKYCDocument(doc: {
  document_id: string;
  kyc_id: string;
  document_type: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_at: string;
}): KYCDocument {
  return {
    document_id: doc.document_id,
    kyc_id: doc.kyc_id,
    document_type: doc.document_type as KYCDocumentType,
    file_name: doc.file_name ?? 'document',
    file_size: doc.file_size ?? 0,
    mime_type: doc.mime_type ?? 'application/octet-stream',
    uploaded_at: doc.uploaded_at,
  };
}

export function normalizeKYCRequest(req: {
  kyc_id: string;
  user_id: string;
  status: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  documents?: Array<{
    document_id: string;
    kyc_id: string;
    document_type: string;
    file_name?: string | null;
    file_size?: number | null;
    mime_type?: string | null;
    uploaded_at: string;
  }>;
}): KYCRequest {
  return {
    kyc_id: req.kyc_id,
    user_id: req.user_id,
    status: req.status as KYCStatus,
    submitted_at: req.submitted_at,
    reviewed_at: req.reviewed_at,
    rejection_reason: req.rejection_reason,
    created_at: req.created_at,
    updated_at: req.updated_at,
    documents: (req.documents ?? []).map(normalizeKYCDocument),
  };
}

export function normalizeUserProfile(raw: Record<string, unknown>): UserProfile {
  return {
    user_id: String(raw.user_id ?? ''),
    sponsor_id: String(raw.sponsor_id ?? ''),
    full_name: String(raw.full_name ?? ''),
    email: String(raw.email ?? ''),
    phone: (raw.phone as string | null) ?? null,
    status: String(raw.status ?? ''),
    role: String(raw.role ?? ''),
    current_package_id: (raw.current_package_id as string | null) ?? null,
    package_activated_at: (raw.package_activated_at as string | null) ?? null,
    monthly_income_paise: Number(raw.monthly_income_paise ?? 0),
    monthly_shopping_paise: Number(raw.monthly_shopping_paise ?? 0),
    income_period_ym: Number(raw.income_period_ym ?? 0),
    today_binary_earned: Number(raw.today_binary_earned ?? 0),
    daily_binary_cap: Number(raw.daily_binary_cap ?? 0),
    placement_status: String(raw.placement_status ?? ''),
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
    package_name: (raw.package_name as string | null) ?? null,
    package_amount: (raw.package_amount as number | null) ?? null,
    direct_wallet_balance: Number(raw.direct_wallet_balance ?? 0),
    team_wallet_balance: Number(raw.team_wallet_balance ?? 0),
    direct_referral_count: Number(raw.direct_referral_count ?? 0),
    sponsor_name: (raw.sponsor_name as string | null) ?? null,
    sponsor_sponsor_id: (raw.sponsor_sponsor_id as string | null) ?? null,
    has_transaction_password: Boolean(raw.has_transaction_password),
    kyc_status: (raw.kyc_status as KYCStatus | null) ?? null,
    kyc_rejection_reason: (raw.kyc_rejection_reason as string | null) ?? null,
    avatar_url: (raw.avatar_url as string | null) ?? null,
    payout_upi_id: (raw.payout_upi_id as string | null) ?? null,
    payout_bank_display: (raw.payout_bank_display as string | null) ?? null,
    secure_wallet_external_id:
      (raw.secure_wallet_external_id as string | null) ?? null,
    secure_wallet_balance_paise:
      (raw.secure_wallet_balance_paise as number | null) ?? null,
  };
}
