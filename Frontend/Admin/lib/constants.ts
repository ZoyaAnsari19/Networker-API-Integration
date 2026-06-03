export const PAGE_SIZE = 10;

export const USER_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "BLOCKED", label: "Blocked" },
];

export const PLACEMENT_STATUS_OPTIONS = [
  { value: "", label: "All placement" },
  { value: "PLACED", label: "Placed" },
  { value: "PENDING_PLACEMENT", label: "Pending placement" },
];

export const LEG_OPTIONS = [
  { value: "", label: "Any leg" },
  { value: "LEFT", label: "Left" },
  { value: "RIGHT", label: "Right" },
];

export const WALLET_TYPE_OPTIONS = [
  { value: "", label: "All wallets" },
  { value: "DIRECT", label: "Direct wallet" },
  { value: "TEAM", label: "Team wallet" },
];

export const LEDGER_SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "DIRECT_COMMISSION", label: "Direct commission" },
  { value: "BINARY_MATCH", label: "Binary match" },
  { value: "LEVEL_BONUS", label: "Level bonus" },
  { value: "FRANCHISE_COMMISSION", label: "Franchise commission" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
  { value: "ADMIN_ADJUSTMENT", label: "Admin adjustment" },
];

export const ENTRY_TYPE_OPTIONS = [
  { value: "", label: "All entries" },
  { value: "CREDIT", label: "Credit" },
  { value: "DEBIT", label: "Debit" },
];

export const PAYOUT_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
];

/** Commission config keys shipped in 008_config.sql */
export const COMMISSION_CONFIG_META: Record<string, { label: string; description: string; type: "number" | "percent" | "boolean" | "string"; unit?: string }> = {
  direct_commission_percent:     { label: "Direct commission",          description: "Percentage of BV credited to sponsor on direct purchase.", type: "percent", unit: "%" },
  binary_match_percent:          { label: "Binary match commission",    description: "Percentage of matched BV credited on each pair match.",    type: "percent", unit: "%" },
  franchise_commission_percent:  { label: "Franchise commission",       description: "Percentage of BV credited to networker sponsor of a franchise.", type: "percent", unit: "%" },
  placement_hold_hours:          { label: "Placement hold window",      description: "Hours given to sponsor before auto-placement triggers.",    type: "number", unit: "hrs" },
  placement_weaker_by:           { label: "Weaker-leg metric",          description: "Method to auto-place: subtree_bv / subtree_count / direct.", type: "string" },
};

/** P2P transfer policy (mock keys for admin UI). */
export const P2P_TRANSFER_CONFIG_META: Record<string, { label: string; description: string; type: "number" | "percent" | "boolean" | "string"; unit?: string }> = {
  p2p_service_charge_percent: { label: "Service charge",           description: "Fee deducted on each P2P transfer, as a percent of the transfer amount.", type: "percent", unit: "%" },
  p2p_min_amount_paise:       { label: "Minimum amount",           description: "Smallest allowed P2P transfer, in paise.", type: "number", unit: "paise" },
  p2p_max_amount_paise:       { label: "Maximum amount",           description: "Largest allowed single P2P transfer, in paise.", type: "number", unit: "paise" },
  p2p_max_per_day_paise:      { label: "Max amount per day",       description: "Total P2P volume a networker may send per calendar day, in paise.", type: "number", unit: "paise" },
  p2p_disabled:               { label: "Disable P2P",              description: "When enabled, all peer-to-peer transfers are blocked platform-wide.", type: "boolean" },
};

export const PAYOUT_CONFIG_META: Record<string, { label: string; description: string; type: "number" | "percent" | "boolean" | "json" | "string"; unit?: string }> = {
  direct_wallet_allowed_dates:         { label: "DIRECT wallet — allowed dates & daily window", description: "Days of the month when networkers can request a withdrawal from their DIRECT wallet (direct + franchise commissions). Use the calendar and the daily clock window on the right.", type: "json" },
  direct_wallet_withdrawal_time_start: { label: "DIRECT wallet — window starts", description: "Earliest clock time on an allowed day when DIRECT withdrawal requests are accepted (24h, e.g. 10:00 for 10:00 am).", type: "string" },
  direct_wallet_withdrawal_time_end:   { label: "DIRECT wallet — window ends",   description: "Latest clock time on an allowed day when DIRECT withdrawal requests are accepted (e.g. 18:00 for 6:00 pm).", type: "string" },
  team_wallet_allowed_dates:           { label: "TEAM wallet — allowed dates & daily window",   description: "Days of the month when networkers can request a withdrawal from their TEAM wallet (binary-match + level bonus). Use the calendar and the daily clock window on the right.", type: "json" },
  team_wallet_withdrawal_time_start:   { label: "TEAM wallet — window starts",   description: "Earliest clock time on an allowed day when TEAM withdrawal requests are accepted.", type: "string" },
  team_wallet_withdrawal_time_end:     { label: "TEAM wallet — window ends",     description: "Latest clock time on an allowed day when TEAM withdrawal requests are accepted.", type: "string" },
  allow_today:                   { label: "Allow all withdrawals for 24 hours", description: "When enabled, bypasses the DIRECT / TEAM allowed-date lists and accepts withdrawal requests from all wallet types for the next 24 hours (rolling window while the flag stays on).", type: "boolean" },
  max_percent_of_monthly_income: { label: "Max % of monthly income",       description: "Upper limit per request as a % of that month's income.", type: "percent", unit: "%" },
  min_withdrawal_amount:         { label: "Minimum withdrawal amount",     description: "Lower limit per withdrawal request, in paise.", type: "number", unit: "paise" },
};
