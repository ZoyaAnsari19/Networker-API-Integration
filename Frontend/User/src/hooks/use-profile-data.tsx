'use client';

import * as React from 'react';
import {
  mockDelay,
  mockKYCRequest,
  mockMeProfile,
} from '@/lib/mock-api-data';

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

export interface ProfileData {
  profile: UserProfile | null;
  kyc: KYCRequest | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  setTransactionPassword: (input: {
    loginPassword: string;
    currentTransactionPassword?: string;
    newTransactionPassword: string;
  }) => Promise<void>;
  updateEmail: (input: {
    newEmail: string;
    loginPassword: string;
    otpVerified: boolean;
  }) => Promise<void>;
  updatePhone: (input: {
    newPhone: string;
    loginPassword: string;
    otpVerified: boolean;
  }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  updatePayoutUPI: (input: {
    payoutUPIId: string;
    loginPassword: string;
  }) => Promise<void>;
  uploadKYCDocument: (
    documentType: KYCDocumentType,
    file: File,
  ) => Promise<KYCDocument>;
  submitKYC: () => Promise<void>;
}

const ProfileDataContext = React.createContext<ProfileData | null>(null);

function useProfileDataState(): ProfileData {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [kyc, setKYC] = React.useState<KYCRequest | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await mockDelay();
      setProfile(mockMeProfile);
      setKYC(mockKYCRequest);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const changePassword = React.useCallback(
    async (_currentPassword: string, _newPassword: string) => {
      await mockDelay(400);
    },
    [],
  );

  const setTransactionPassword = React.useCallback(
    async (_input: {
      loginPassword: string;
      currentTransactionPassword?: string;
      newTransactionPassword: string;
    }) => {
      await mockDelay(400);
      setProfile((p) => (p ? { ...p, has_transaction_password: true } : p));
    },
    [],
  );

  const updateEmail = React.useCallback(
    async (input: {
      newEmail: string;
      loginPassword: string;
      otpVerified: boolean;
    }) => {
      await mockDelay(400);
      setProfile((p) => (p ? { ...p, email: input.newEmail.trim() } : p));
    },
    [],
  );

  const updatePhone = React.useCallback(
    async (input: {
      newPhone: string;
      loginPassword: string;
      otpVerified: boolean;
    }) => {
      await mockDelay(400);
      setProfile((p) => (p ? { ...p, phone: input.newPhone.trim() } : p));
    },
    [],
  );

  const uploadAvatar = React.useCallback(async (file: File) => {
    await mockDelay(400);
    const url = URL.createObjectURL(file);
    setProfile((p) => (p ? { ...p, avatar_url: url } : p));
  }, []);

  const updatePayoutUPI = React.useCallback(
    async (input: { payoutUPIId: string; loginPassword: string }) => {
      await mockDelay(400);
      setProfile((p) =>
        p ? { ...p, payout_upi_id: input.payoutUPIId.trim() } : p,
      );
    },
    [],
  );

  const uploadKYCDocument = React.useCallback(
    async (documentType: KYCDocumentType, file: File) => {
      await mockDelay(400);
      const doc: KYCDocument = {
        document_id: `doc_mock_${Date.now()}`,
        kyc_id: mockKYCRequest.kyc_id,
        document_type: documentType,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        uploaded_at: new Date().toISOString(),
      };
      setKYC((k) =>
        k
          ? { ...k, documents: [...k.documents, doc], status: 'SUBMITTED' }
          : { ...mockKYCRequest, documents: [doc], status: 'SUBMITTED' },
      );
      return doc;
    },
    [],
  );

  const submitKYC = React.useCallback(async () => {
    await mockDelay(400);
    setKYC((k) =>
      k ? { ...k, status: 'SUBMITTED', submitted_at: new Date().toISOString() } : k,
    );
  }, []);

  return {
    profile,
    kyc,
    loading,
    error,
    refresh: load,
    changePassword,
    setTransactionPassword,
    updateEmail,
    updatePhone,
    uploadAvatar,
    updatePayoutUPI,
    uploadKYCDocument,
    submitKYC,
  };
}

export function ProfileDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useProfileDataState();
  return (
    <ProfileDataContext.Provider value={value}>
      {children}
    </ProfileDataContext.Provider>
  );
}

export function useProfileData(): ProfileData {
  const ctx = React.useContext(ProfileDataContext);
  if (!ctx) {
    throw new Error('useProfileData must be used inside <ProfileDataProvider>');
  }
  return ctx;
}
