'use client';

import * as React from 'react';
import {
  changePasswordRequest,
  fetchMyKYC,
  fetchMyProfile,
  setTransactionPasswordRequest,
  submitKYCRequest,
  updateEmailRequest,
  updatePayoutUPIRequest,
  updatePhoneRequest,
  uploadAvatarRequest,
  uploadKYCDocumentRequest,
} from '@/lib/profile-api';
import type {
  KYCDocumentType,
  KYCRequest,
  UserProfile,
} from '@/lib/profile-types';
import { devError, devLog } from '@/lib/dev-log';

export type {
  KYCStatus,
  KYCDocumentType,
  UserProfile,
  KYCDocument,
  KYCRequest,
} from '@/lib/profile-types';

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
  ) => Promise<import('@/lib/profile-types').KYCDocument>;
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
    devLog('Profile', 'Loading /me + /kyc/me…');
    try {
      const [profileData, kycData] = await Promise.all([
        fetchMyProfile(),
        fetchMyKYC(),
      ]);
      setProfile(profileData);
      setKYC(kycData);
      devLog('Profile', 'Loaded', {
        full_name: profileData.full_name,
        sponsor_id: profileData.sponsor_id,
        direct_referral_count: profileData.direct_referral_count,
        monthly_income_paise: profileData.monthly_income_paise,
        today_binary_earned: profileData.today_binary_earned,
        daily_binary_cap: profileData.daily_binary_cap,
        kyc_status: profileData.kyc_status ?? kycData?.status ?? null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load profile';
      devError('Profile', msg, e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const changePassword = React.useCallback(
    async (currentPassword: string, newPassword: string) => {
      await changePasswordRequest(currentPassword, newPassword);
    },
    [],
  );

  const setTransactionPassword = React.useCallback(
    async (input: {
      loginPassword: string;
      currentTransactionPassword?: string;
      newTransactionPassword: string;
    }) => {
      await setTransactionPasswordRequest(input);
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
      await updateEmailRequest(input);
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
      await updatePhoneRequest(input);
      setProfile((p) => (p ? { ...p, phone: input.newPhone.trim() } : p));
    },
    [],
  );

  const uploadAvatar = React.useCallback(
    async (file: File) => {
      await uploadAvatarRequest(file);
      const refreshed = await fetchMyProfile();
      setProfile(refreshed);
    },
    [],
  );

  const updatePayoutUPI = React.useCallback(
    async (input: { payoutUPIId: string; loginPassword: string }) => {
      await updatePayoutUPIRequest(input);
      setProfile((p) =>
        p ? { ...p, payout_upi_id: input.payoutUPIId.trim() } : p,
      );
    },
    [],
  );

  const uploadKYCDocument = React.useCallback(
    async (documentType: KYCDocumentType, file: File) => {
      const doc = await uploadKYCDocumentRequest(documentType, file);
      setKYC((k) =>
        k
          ? {
              ...k,
              documents: [...k.documents.filter((d) => d.document_type !== documentType), doc],
              status: 'PENDING',
            }
          : {
              kyc_id: doc.kyc_id,
              user_id: profile?.user_id ?? '',
              status: 'PENDING',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              documents: [doc],
            },
      );
      return doc;
    },
    [profile?.user_id],
  );

  const submitKYC = React.useCallback(async () => {
    await submitKYCRequest();
    setKYC((k) =>
      k
        ? { ...k, status: 'SUBMITTED', submitted_at: new Date().toISOString() }
        : k,
    );
    setProfile((p) => (p ? { ...p, kyc_status: 'SUBMITTED' } : p));
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
