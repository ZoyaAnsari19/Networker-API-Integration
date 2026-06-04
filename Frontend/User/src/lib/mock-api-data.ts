/**
 * Static mock responses for the user app (no backend calls).
 */
import {
  currentUser,
  binaryStatus,
  leftTeamMembers,
  rightTeamMembers,
  referralStats,
  earningsData,
} from '@/lib/dummy-data';

export function mockDelay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockWalletSummary = {
  direct_balance: 4_500_000,
  team_balance: 3_200_000,
  total_balance: 7_700_000,
};

export const mockMeProfile = {
  user_id: currentUser.id,
  sponsor_id: currentUser.referralCode,
  full_name: currentUser.name,
  email: currentUser.email,
  phone: currentUser.phone,
  status: 'ACTIVE' as const,
  role: 'USER',
  current_package_id: 'pkg_silver',
  package_activated_at: currentUser.createdAt,
  monthly_income_paise: 1_874_250,
  monthly_shopping_paise: 180_000,
  income_period_ym: 202606,
  today_binary_earned: 84_732,
  daily_binary_cap: 500_000,
  placement_status: 'PLACED',
  created_at: currentUser.createdAt,
  updated_at: new Date().toISOString(),
  package_name: currentUser.package,
  package_amount: currentUser.packageAmount * 100,
  direct_wallet_balance: mockWalletSummary.direct_balance,
  team_wallet_balance: mockWalletSummary.team_balance,
  direct_referral_count: referralStats.totalInvited,
  sponsor_name: 'Demo Sponsor',
  sponsor_sponsor_id: 'SPONSOR001',
  has_transaction_password: true,
  kyc_status: 'APPROVED' as const,
  kyc_rejection_reason: null,
  avatar_url: currentUser.avatar,
  payout_upi_id: 'alex@upi',
  payout_bank_display: 'HDFC ****4521',
  secure_wallet_external_id: 'SC-DEMO-001',
  secure_wallet_balance_paise: 1_250_000,
};

export interface MockLedgerEntry {
  id: number;
  user_id: string;
  wallet_type: 'DIRECT' | 'TEAM';
  amount: number;
  entry_type: 'CREDIT' | 'DEBIT';
  source: string;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  created_at: string;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

export const mockDirectLedger: MockLedgerEntry[] = [
  {
    id: 101,
    user_id: currentUser.id,
    wallet_type: 'DIRECT',
    amount: 12_550,
    entry_type: 'CREDIT',
    source: 'DIRECT_COMMISSION',
    reference_id: 'ref_1',
    reference_type: 'REFERRAL',
    description: 'Sarah Miller — direct referral',
    created_at: daysAgo(1),
  },
  {
    id: 102,
    user_id: currentUser.id,
    wallet_type: 'DIRECT',
    amount: 8_750,
    entry_type: 'CREDIT',
    source: 'DIRECT_COMMISSION',
    reference_id: 'ref_2',
    reference_type: 'REFERRAL',
    description: 'James Wilson — direct referral',
    created_at: daysAgo(3),
  },
  {
    id: 103,
    user_id: currentUser.id,
    wallet_type: 'DIRECT',
    amount: 50_000,
    entry_type: 'DEBIT',
    source: 'WITHDRAWAL',
    reference_id: 'wd_1',
    reference_type: 'PAYOUT',
    description: 'Withdrawal to bank ****4521',
    created_at: daysAgo(5),
  },
  {
    id: 104,
    user_id: currentUser.id,
    wallet_type: 'DIRECT',
    amount: 15_000,
    entry_type: 'CREDIT',
    source: 'FRANCHISE_COMMISSION',
    reference_id: null,
    reference_type: null,
    description: 'Franchise bonus',
    created_at: daysAgo(8),
  },
  {
    id: 105,
    user_id: currentUser.id,
    wallet_type: 'DIRECT',
    amount: 25_000,
    entry_type: 'CREDIT',
    source: 'DIRECT_COMMISSION',
    reference_id: 'ref_3',
    reference_type: 'REFERRAL',
    description: 'Emily Chen — direct referral',
    created_at: daysAgo(12),
  },
];

export const mockTeamLedger: MockLedgerEntry[] = [
  {
    id: 201,
    user_id: currentUser.id,
    wallet_type: 'TEAM',
    amount: 25_000,
    entry_type: 'CREDIT',
    source: 'BINARY_MATCH',
    reference_id: null,
    reference_type: null,
    description: 'Binary matching bonus',
    created_at: daysAgo(0),
  },
  {
    id: 202,
    user_id: currentUser.id,
    wallet_type: 'TEAM',
    amount: 8_725,
    entry_type: 'CREDIT',
    source: 'LEVEL_BONUS',
    reference_id: null,
    reference_type: null,
    description: 'Level 3 commission',
    created_at: daysAgo(2),
  },
  {
    id: 203,
    user_id: currentUser.id,
    wallet_type: 'TEAM',
    amount: 18_500,
    entry_type: 'CREDIT',
    source: 'BINARY_MATCH',
    reference_id: null,
    reference_type: null,
    description: 'Binary matching bonus',
    created_at: daysAgo(4),
  },
  {
    id: 204,
    user_id: currentUser.id,
    wallet_type: 'TEAM',
    amount: 5_000,
    entry_type: 'DEBIT',
    source: 'P2P_TRANSFER',
    reference_id: 'p2p_1',
    reference_type: 'P2P',
    description: 'P2P to RIGHT456ABC',
    created_at: daysAgo(6),
  },
  {
    id: 205,
    user_id: currentUser.id,
    wallet_type: 'TEAM',
    amount: 12_000,
    entry_type: 'CREDIT',
    source: 'LEVEL_BONUS',
    reference_id: null,
    reference_type: null,
    description: 'Level 2 commission',
    created_at: daysAgo(10),
  },
];

export const mockTreeView = {
  user_id: currentUser.id,
  full_name: currentUser.name,
  leg: null as string | null,
  left_bv: binaryStatus.leftVolume * 100,
  right_bv: binaryStatus.rightVolume * 100,
  status: 'ACTIVE',
  left: {
    user_id: 'tm_001',
    full_name: 'Sarah Miller',
    leg: 'LEFT',
    left_bv: 500_000,
    right_bv: 300_000,
    status: 'ACTIVE',
  },
  right: {
    user_id: 'tm_006',
    full_name: 'James Wilson',
    leg: 'RIGHT',
    left_bv: 400_000,
    right_bv: 450_000,
    status: 'ACTIVE',
  },
};

export const mockPackages = [
  {
    package_id: 'pkg_starter',
    name: 'Starter',
    amount: 500_000,
    daily_binary_cap: 100_000,
    status: 'ACTIVE',
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    package_id: 'pkg_silver',
    name: 'Silver',
    amount: 2_500_000,
    daily_binary_cap: 500_000,
    status: 'ACTIVE',
    sort_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    package_id: 'pkg_gold',
    name: 'Gold',
    amount: 5_000_000,
    daily_binary_cap: 1_000_000,
    status: 'ACTIVE',
    sort_order: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    package_id: 'pkg_platinum',
    name: 'Platinum',
    amount: 10_000_000,
    daily_binary_cap: 2_000_000,
    status: 'ACTIVE',
    sort_order: 4,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const mockP2PQuote = {
  enabled: true,
  min_amount_paise: 10_000,
  service_charge_percent: 2,
};

export const mockP2PTransfers = [
  {
    transfer_id: 'p2p_t1',
    sender_user_id: currentUser.id,
    receiver_user_id: 'usr_002',
    sender_sponsor_id: currentUser.referralCode,
    receiver_sponsor_id: 'RIGHT456ABC',
    wallet_type: 'TEAM',
    amount: 50_000,
    service_charge: 1_000,
    net_amount: 49_000,
    note: 'Team support',
    direction: 'OUT' as const,
    counterparty_name: 'James Wilson',
    created_at: daysAgo(2),
  },
  {
    transfer_id: 'p2p_t2',
    sender_user_id: 'usr_003',
    receiver_user_id: currentUser.id,
    sender_sponsor_id: 'LEFT789XYZ',
    receiver_sponsor_id: currentUser.referralCode,
    wallet_type: 'DIRECT',
    amount: 25_000,
    service_charge: 500,
    net_amount: 24_500,
    note: null,
    direction: 'IN' as const,
    counterparty_name: 'Sarah Miller',
    created_at: daysAgo(5),
  },
];

export const mockWithdrawalSchedule = {
  server_now_ist: new Date().toISOString(),
  ist_start_hour: 10,
  ist_end_hour: 18,
  within_time_window: true,
  min_withdrawal_paise: 500_00,
  service_charge_percent: 2,
  tds_percent: 5,
  allowed_dates_direct: [1, 5, 10, 15, 20, 25],
  allowed_dates_team: [1, 5, 10, 15, 20, 25],
  today_allowed_for_direct: true,
  today_allowed_for_team: true,
  max_percent_of_monthly_income: 50,
};

export const mockPayouts = [
  {
    payout_id: 'pay_001',
    user_id: currentUser.id,
    wallet_type: 'DIRECT',
    requested_amount: 150_000,
    service_charge_paise: 3_000,
    tds_paise: 7_500,
    net_payout_paise: 139_500,
    payment_method: 'SECURE_WALLET',
    status: 'COMPLETED',
    requested_at: daysAgo(7),
    processed_at: daysAgo(5),
  },
  {
    payout_id: 'pay_002',
    user_id: currentUser.id,
    wallet_type: 'TEAM',
    requested_amount: 80_000,
    service_charge_paise: 1_600,
    tds_paise: 4_000,
    net_payout_paise: 74_400,
    payment_method: 'SECURE_WALLET',
    status: 'PENDING',
    requested_at: daysAgo(1),
    processed_at: null,
  },
];

export const mockDirectReferrals = [
  ...leftTeamMembers.filter((m) => m.isDirect),
  ...rightTeamMembers.filter((m) => m.isDirect),
].map((m, i) => ({
  user_id: m.id,
  sponsor_id: `REF${String(i + 1).padStart(3, '0')}`,
  full_name: m.name,
  email: m.email,
  phone: m.phone,
  status: (m.status === 'active' ? 'ACTIVE' : 'INACTIVE') as
    | 'ACTIVE'
    | 'INACTIVE'
    | 'BLOCKED',
  placement_status: 'PLACED' as const,
  leg: (m.side === 'left' ? 'LEFT' : 'RIGHT') as 'LEFT' | 'RIGHT',
  package_name: m.package,
  total_direct_earned: Math.floor(m.volume * 10),
  created_at: m.joinedAt,
}));

export const mockPlacementRequests = [
  {
    id: 'pl_001',
    user_id: 'usr_pending_1',
    sponsor_user_id: currentUser.id,
    status: 'PENDING',
    expires_at: daysAgo(-3),
    created_at: daysAgo(1),
  },
];

export const mockKYCRequest = {
  kyc_id: 'kyc_demo',
  user_id: currentUser.id,
  status: 'APPROVED' as const,
  submitted_at: daysAgo(30),
  reviewed_at: daysAgo(28),
  rejection_reason: null,
  created_at: daysAgo(35),
  updated_at: daysAgo(28),
  documents: [
    {
      document_id: 'doc_1',
      kyc_id: 'kyc_demo',
      document_type: 'PAN_CARD' as const,
      file_name: 'pan.pdf',
      file_size: 120_000,
      mime_type: 'application/pdf',
      uploaded_at: daysAgo(32),
    },
  ],
};

/** Dashboard earnings totals derived from mock ledger (rupees-scale for display hooks). */
export const mockEarningsTotals = {
  today: earningsData.today,
  weekly: earningsData.weekly,
  monthly: earningsData.monthly,
  total: earningsData.total,
};
