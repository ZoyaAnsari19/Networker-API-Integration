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

/** P2P transfer policy (stored in commission_config). */
export const P2P_TRANSFER_CONFIG_META: Record<string, { label: string; description: string; type: "number" | "percent" | "boolean" | "string"; unit?: string }> = {
  p2p_enabled:                { label: "Enable P2P transfers",     description: "When disabled, all peer-to-peer transfers are blocked platform-wide.", type: "boolean" },
  p2p_service_charge_percent: { label: "Service charge",           description: "Fee deducted on each P2P transfer, as a percent of the transfer amount.", type: "percent", unit: "%" },
  p2p_min_amount_paise:       { label: "Minimum amount",           description: "Smallest allowed P2P transfer, in paise.", type: "number", unit: "paise" },
};

export const PAYOUT_CONFIG_META: Record<string, { label: string; description: string; type: "number" | "percent" | "boolean" | "json" | "string"; unit?: string }> = {
  withdrawal_allowed_dates_direct:           { label: "DIRECT wallet — allowed dates", description: "Days of the month when networkers can request a withdrawal from their DIRECT wallet (direct + franchise commissions).", type: "json" },
  withdrawal_allowed_dates_team:             { label: "TEAM wallet — allowed dates",   description: "Days of the month when networkers can request a withdrawal from their TEAM wallet (binary-match + level bonus).", type: "json" },
  withdrawal_ist_start_hour:               { label: "Withdrawal window starts (IST)", description: "Earliest hour (0–23, IST) on an allowed day when withdrawal requests are accepted. E.g. 10 = 10:00 am.", type: "number", unit: "hour" },
  withdrawal_ist_end_hour:                 { label: "Withdrawal window ends (IST)",   description: "Latest hour (0–23, IST) on an allowed day when withdrawal requests are accepted. E.g. 17 = 5:00 pm.", type: "number", unit: "hour" },
  min_withdrawal_amount:                   { label: "Minimum withdrawal amount",     description: "Lower limit per withdrawal request, in paise.", type: "number", unit: "paise" },
  withdrawal_max_percent_of_monthly_income:  { label: "Max % of monthly income",       description: "Upper limit per request as a % of that month's income.", type: "percent", unit: "%" },
  withdrawal_service_charge_percent:       { label: "Withdrawal service charge",     description: "Fee deducted on each approved withdrawal, as a percent of the requested amount.", type: "percent", unit: "%" },
  withdrawal_tds_percent:                  { label: "Withdrawal TDS",                description: "Tax deducted at source on each withdrawal, as a percent of the requested amount.", type: "percent", unit: "%" },
};
