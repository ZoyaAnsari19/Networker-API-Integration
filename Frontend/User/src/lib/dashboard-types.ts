export interface DashboardProfile {
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
  package_name: string | null;
  package_amount: number | null;
  direct_wallet_balance: number;
  team_wallet_balance: number;
  direct_referral_count: number;
  sponsor_name: string | null;
}

export interface WalletSummary {
  direct_balance: number;
  team_balance: number;
  total_balance: number;
}

export interface LedgerEntry {
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

export interface TreeView {
  user_id: string;
  full_name: string;
  leg: string | null;
  left_bv: number;
  right_bv: number;
  status: string;
  left?: TreeView;
  right?: TreeView;
}

export interface BinarySide {
  count: number;
  activeCount: number;
  volume: number;
}

export interface BinarySides {
  left: BinarySide;
  right: BinarySide;
}

export interface DailyEarnings {
  date: string;
  dateLabel: string;
  direct: number;
  binary: number;
}

export interface EarningsTotals {
  today: number;
  weekly: number;
  monthly: number;
  total: number;
}
