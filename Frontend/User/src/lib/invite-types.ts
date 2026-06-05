export type ReferralStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type PlacementStatus = 'PLACED' | 'PENDING_PLACEMENT';
export type ReferralLeg = 'LEFT' | 'RIGHT';

export interface DirectReferral {
  user_id: string;
  sponsor_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: ReferralStatus;
  placement_status: PlacementStatus;
  leg: ReferralLeg | null;
  package_name: string | null;
  total_direct_earned: number;
  created_at: string;
}

export interface InviteProfile {
  user_id: string;
  sponsor_id: string;
  full_name: string;
  monthly_income_paise: number;
  direct_referral_count: number;
}

export interface InviteStatsSummary {
  totalInvited: number;
  activeUsers: number;
  pendingPlacements: number;
  totalCommission: number;
  leftCount: number;
  rightCount: number;
  unplacedCount: number;
}

export interface PlacementRequestSummary {
  id: string;
  user_id: string;
  sponsor_user_id: string;
  status: string;
  expires_at: string;
  created_at: string;
}
