/* ============================================================
   MOCK DATA — Admin demo UI (no backend / API calls).
   All monetary values in paise (1 INR = 100 paise).
   ============================================================ */

export type Package = {
  package_id: string;
  name: string;
  amount: number;                 // paise
  direct_cap_multiplier: number;  // default 4x
  binary_cap_multiplier: number;  // default 10x
  daily_binary_cap: number;       // paise per day
  status: "ACTIVE" | "DISABLED";
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type User = {
  user_id: string;
  sponsor_id: string;              // SPF00001
  sponsor_code_of: string | null;  // upline SPF code
  full_name: string;
  email: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  role: "NETWORKER" | "ADMIN";
  package_id: string | null;
  package_name: string | null;
  package_amount: number | null;
  leg: "LEFT" | "RIGHT" | null;
  placement_status: "PLACED" | "PENDING_PLACEMENT";
  total_direct_earned: number;    // paise
  total_binary_earned: number;    // paise
  max_direct_cap: number;         // paise (lifetime)
  max_binary_cap: number;         // paise (lifetime)
  today_binary_earned: number;    // paise today
  daily_binary_cap: number;       // paise/day
  direct_balance: number;         // paise (direct wallet)
  team_balance: number;           // paise (team wallet)
  /** Linked Secure Coin (platform) wallet — balance in paise; meaningful only when linked. */
  secure_wallet_linked: boolean;
  /** External / platform wallet identifier when linked (e.g. SCW…). */
  secure_wallet_id: string | null;
  secure_wallet_balance: number;  // paise
  left_carry_bv: number;          // paise — unmatched BV sitting on LEFT leg
  right_carry_bv: number;         // paise — unmatched BV sitting on RIGHT leg
  created_at: string;
};

export type LedgerEntry = {
  id: number;
  user_id: string;
  sponsor_id: string;
  user_name: string;
  wallet_type: "DIRECT" | "TEAM";
  amount: number;                 // paise
  entry_type: "CREDIT" | "DEBIT";
  source:
    | "DIRECT_COMMISSION"
    | "BINARY_MATCH"
    | "LEVEL_BONUS"
    | "FRANCHISE_COMMISSION"
    | "WITHDRAWAL"
    | "ADMIN_ADJUSTMENT";
  reference_id?: string;
  reference_type?: "PURCHASE" | "PAYOUT" | "ADMIN" | "PACKAGE_ACTIVATION";
  description?: string;
  created_at: string;              // ISO
};

export type DirectIncomeRow = {
  id: number;
  user_id: string;                // earner (sponsor)
  user_sponsor_id: string;        // earner SPF code
  user_name: string;
  source_order_id: string;
  downline_sponsor_id: string;    // buyer
  downline_name: string;
  bv_amount: number;              // paise
  commission: number;             // paise (10% of BV by default)
  capped: boolean;
  cap_remaining: number;          // paise
  created_at: string;
};

export type BinaryIncomeRow = {
  id: number;
  user_id: string;
  user_sponsor_id: string;
  user_name: string;
  source_order_id: string;
  matched_bv: number;             // paise
  commission: number;             // paise (binary match)
  level_bonus: number;            // paise
  total_credited: number;         // paise
  cap_deducted: number;           // paise (portion chopped by caps)
  pair_number: number;            // nth pair on that day
  carry_forward_bv: number;       // paise
  carry_forward_leg: "LEFT" | "RIGHT";
  created_at: string;
};

export type PayoutRequest = {
  payout_id: string;
  user_id: string;
  sponsor_id: string;
  user_name: string;
  email: string;
  wallet_type: "DIRECT" | "TEAM";
  requested_amount: number;       // paise
  approved_amount?: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PROCESSING" | "COMPLETED" | "FAILED";
  admin_note?: string | null;
  sc_tx_reference?: string | null;
  sc_user_email?: string | null;
  requested_at: string;
  processed_at?: string | null;
};

export type PlacementReq = {
  id: string;
  new_user_id: string;
  new_user_name: string;
  new_user_email: string;
  sponsor_id: string;
  sponsor_name: string;
  status: "PENDING" | "APPROVED" | "EXPIRED" | "REJECTED";
  requested_at: string;
  expires_at: string;
};

export type LevelBonusSlab = {
  pair_number: number;
  bonus_percent: number;
  max_level: number;
  is_active: boolean;
};

export type KycStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";

export type KycDocument = {
  document_id: string;
  document_type:
    | "PAN_CARD"
    | "AADHAAR_CARD"
    | "AADHAAR_FRONT"
    | "AADHAAR_BACK"
    | "BANK_PASSBOOK"
    | "OTHER";
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  document_url: string;
  uploaded_at: string;
};

export type BankAccount = {
  bank_name: string;
  account_holder_name: string;
  account_number_masked: string;
  ifsc: string;
};

export type KycRequestRow = {
  kyc_id: string;
  user_id: string;
  sponsor_id: string;
  full_name: string;
  email: string;
  phone?: string;
  status: KycStatus;
  submitted_at?: string;
  reviewed_at?: string;
  rejection_reason?: string | null;
  documents: KycDocument[];
  bank_account?: BankAccount | null;
};

/* ------------------------------------------------------------------
   SEED DATA
   ------------------------------------------------------------------ */

/** Matches Backend/Database/014_seed_real_packages.sql (₹2,500 / ₹7,500 / ₹15,000). */
export const PACKAGES_INITIAL: Package[] = [
  {
    package_id: "a1111111-1111-1111-1111-111111111101",
    name: "Silver",
    amount: 250_000,
    direct_cap_multiplier: 4,
    binary_cap_multiplier: 10,
    daily_binary_cap: 0,
    status: "ACTIVE",
    sort_order: 1,
    created_at: "2026-01-05T10:00:00Z",
    updated_at: "2026-03-12T08:30:00Z",
  },
  {
    package_id: "a1111111-1111-1111-1111-111111111102",
    name: "Gold",
    amount: 750_000,
    direct_cap_multiplier: 4,
    binary_cap_multiplier: 10,
    daily_binary_cap: 0,
    status: "ACTIVE",
    sort_order: 2,
    created_at: "2026-01-05T10:00:00Z",
    updated_at: "2026-03-20T11:14:00Z",
  },
  {
    package_id: "a1111111-1111-1111-1111-111111111103",
    name: "Platinum",
    amount: 1_500_000,
    direct_cap_multiplier: 4,
    binary_cap_multiplier: 10,
    daily_binary_cap: 0,
    status: "ACTIVE",
    sort_order: 3,
    created_at: "2026-01-05T10:00:00Z",
    updated_at: "2026-04-02T10:05:00Z",
  },
];

const NAMES = [
  "Rahul Sharma", "Priya Verma", "Amit Kumar", "Sneha Patel", "Vikas Gupta",
  "Meera Singh", "Rohit Jain", "Anjali Mehta", "Arjun Nair", "Kavya Rao",
  "Siddharth Iyer", "Neha Bansal", "Harsh Malhotra", "Divya Kapoor", "Manish Agarwal",
  "Pooja Saxena", "Rajesh Chauhan", "Swati Bhatt", "Nikhil Khanna", "Ritu Chawla",
];

function spf(n: number) {
  return `SPF${String(n).padStart(5, "0")}`;
}

function isoAgo(daysAgo: number, hoursAgo = 0, minsAgo = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(d.getUTCHours() - hoursAgo);
  d.setUTCMinutes(d.getUTCMinutes() - minsAgo);
  return d.toISOString();
}

export const USERS_INITIAL: User[] = NAMES.map((name, i) => {
  const idx = i + 1;
  const pkg = PACKAGES_INITIAL[idx % PACKAGES_INITIAL.length];
  const sponsorCode = idx === 1 ? null : spf(((idx - 1) % Math.max(1, idx - 1)) + 1);
  const directEarned = Math.round((idx * 1234.56 * 100)) % (pkg.amount * pkg.direct_cap_multiplier);
  const binaryEarned = Math.round((idx * 2345.12 * 100)) % (pkg.amount * pkg.binary_cap_multiplier);
  const placement = idx % 9 === 0 ? "PENDING_PLACEMENT" : "PLACED";
  const status = idx % 11 === 0 ? "INACTIVE" : idx % 17 === 0 ? "BLOCKED" : "ACTIVE";
  return {
    user_id: `u-${String(idx).padStart(4, "0")}`,
    sponsor_id: spf(idx),
    sponsor_code_of: sponsorCode,
    full_name: name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@fmcg.test`,
    phone: `+91 98${String(10000000 + idx * 137).slice(0, 8)}`,
    status,
    role: "NETWORKER",
    package_id: pkg.package_id,
    package_name: pkg.name,
    package_amount: pkg.amount,
    leg: idx % 2 === 0 ? "LEFT" : "RIGHT",
    placement_status: placement as User["placement_status"],
    total_direct_earned: directEarned,
    total_binary_earned: binaryEarned,
    max_direct_cap: pkg.amount * pkg.direct_cap_multiplier,
    max_binary_cap: pkg.amount * pkg.binary_cap_multiplier,
    today_binary_earned: Math.round((idx * 456.78 * 100)) % pkg.daily_binary_cap,
    daily_binary_cap: pkg.daily_binary_cap,
    direct_balance: Math.round(directEarned * 0.4),
    team_balance: Math.round(binaryEarned * 0.35),
    secure_wallet_linked: idx % 7 !== 0,
    secure_wallet_id: idx % 7 === 0 ? null : `SCW${String(1_008_000 + idx * 91_337).slice(0, 10)}`,
    secure_wallet_balance: idx % 7 === 0 ? 0 : Math.round(1_200_000 + (idx * 99_765) % 8_500_000),
    left_carry_bv:  idx % 2 === 0 ? Math.round((idx * 3317 * 100)) % (pkg.amount * 2) : Math.round((idx * 1117 * 100)) % pkg.amount,
    right_carry_bv: idx % 2 === 0 ? Math.round((idx * 1217 * 100)) % pkg.amount       : Math.round((idx * 2713 * 100)) % (pkg.amount * 2),
    created_at: isoAgo(90 - idx),
  };
});

const SOURCES: LedgerEntry["source"][] = [
  "DIRECT_COMMISSION", "BINARY_MATCH", "LEVEL_BONUS",
  "FRANCHISE_COMMISSION", "WITHDRAWAL", "ADMIN_ADJUSTMENT",
];

export const LEDGER_INITIAL: LedgerEntry[] = Array.from({ length: 80 }, (_, i) => {
  const user = USERS_INITIAL[i % USERS_INITIAL.length];
  const source = SOURCES[i % SOURCES.length];
  const isDebit = source === "WITHDRAWAL" || (source === "ADMIN_ADJUSTMENT" && i % 3 === 0);
  const wallet: LedgerEntry["wallet_type"] =
    source === "DIRECT_COMMISSION" || source === "FRANCHISE_COMMISSION" ? "DIRECT" : "TEAM";
  const amount = 25_000 + (i * 137) % 1_800_000;
  return {
    id: 10_000 + i,
    user_id: user.user_id,
    sponsor_id: user.sponsor_id,
    user_name: user.full_name,
    wallet_type: wallet,
    amount,
    entry_type: isDebit ? "DEBIT" : "CREDIT",
    source,
    reference_id: source === "WITHDRAWAL" ? `po-${1000 + i}` : `ord-${90000 + i}`,
    reference_type: source === "WITHDRAWAL" ? "PAYOUT" : "PURCHASE",
    description:
      source === "DIRECT_COMMISSION" ? `Direct commission on purchase ord-${90000 + i}` :
      source === "BINARY_MATCH" ? `Binary match (pair #${(i % 10) + 1})` :
      source === "LEVEL_BONUS" ? `Level bonus (level ${(i % 10) + 1})` :
      source === "FRANCHISE_COMMISSION" ? `Franchise commission` :
      source === "WITHDRAWAL" ? `Payout request po-${1000 + i}` :
      `Admin adjustment`,
    created_at: isoAgo(Math.floor(i / 3), i % 24, (i * 7) % 60),
  };
});

export const DIRECT_INCOME_INITIAL: DirectIncomeRow[] = Array.from({ length: 60 }, (_, i) => {
  const earner = USERS_INITIAL[i % USERS_INITIAL.length];
  const buyer = USERS_INITIAL[(i * 3 + 1) % USERS_INITIAL.length];
  const bv = 100_000 + (i * 97) % 1_500_000;
  const commission = Math.round(bv * 0.1);
  const capRem = Math.max(0, earner.max_direct_cap - earner.total_direct_earned - commission * i);
  return {
    id: 20_000 + i,
    user_id: earner.user_id,
    user_sponsor_id: earner.sponsor_id,
    user_name: earner.full_name,
    source_order_id: `ord-${80000 + i}`,
    downline_sponsor_id: buyer.sponsor_id,
    downline_name: buyer.full_name,
    bv_amount: bv,
    commission,
    capped: capRem === 0 && i % 9 === 0,
    cap_remaining: capRem,
    created_at: isoAgo(Math.floor(i / 4), i % 24),
  };
});

export const BINARY_INCOME_INITIAL: BinaryIncomeRow[] = Array.from({ length: 60 }, (_, i) => {
  const earner = USERS_INITIAL[(i + 2) % USERS_INITIAL.length];
  const matched = 80_000 + (i * 113) % 1_800_000;
  const commission = Math.round(matched * 0.10);
  const pairNum = (i % 10) + 1;
  const slabPercent = pairNum === 1 ? 2.5 : pairNum <= 3 ? 2.5 : pairNum <= 5 ? 3.0 : pairNum <= 7 ? 3.5 : pairNum <= 9 ? 4.0 : 5.0;
  const levelBonus = Math.round(matched * (slabPercent / 100));
  const total = commission + levelBonus;
  const capHit = i % 13 === 0;
  return {
    id: 30_000 + i,
    user_id: earner.user_id,
    user_sponsor_id: earner.sponsor_id,
    user_name: earner.full_name,
    source_order_id: `ord-${70000 + i}`,
    matched_bv: matched,
    commission,
    level_bonus: levelBonus,
    total_credited: capHit ? Math.floor(total * 0.3) : total,
    cap_deducted: capHit ? total - Math.floor(total * 0.3) : 0,
    pair_number: pairNum,
    carry_forward_bv: (i * 4321) % 900_000,
    carry_forward_leg: i % 2 === 0 ? "LEFT" : "RIGHT",
    created_at: isoAgo(Math.floor(i / 3), (i * 2) % 24),
  };
});

export const PAYOUTS_INITIAL: PayoutRequest[] = Array.from({ length: 18 }, (_, i) => {
  const user = USERS_INITIAL[i % USERS_INITIAL.length];
  const statuses: PayoutRequest["status"][] = ["PENDING", "PENDING", "APPROVED", "COMPLETED", "REJECTED", "PROCESSING"];
  const st = statuses[i % statuses.length];
  const req = 100_000 + (i * 251) % 2_500_000;
  const processed = st !== "PENDING" ? isoAgo(Math.floor(i / 2), i % 12) : null;
  return {
    payout_id: `po-${1000 + i}`,
    user_id: user.user_id,
    sponsor_id: user.sponsor_id,
    user_name: user.full_name,
    email: user.email,
    wallet_type: i % 2 === 0 ? "DIRECT" : "TEAM",
    requested_amount: req,
    approved_amount: st === "APPROVED" || st === "COMPLETED" ? req : null,
    status: st,
    admin_note: st === "REJECTED" ? "Bank details missing — please re-submit." : null,
    sc_tx_reference: st === "COMPLETED" ? `SC-TX-${200000 + i}` : null,
    sc_user_email: user.email,
    requested_at: isoAgo(Math.floor(i / 2) + 1),
    processed_at: processed,
  };
});

export const PLACEMENT_REQUESTS_INITIAL: PlacementReq[] = Array.from({ length: 7 }, (_, i) => {
  const child = USERS_INITIAL[(i * 2 + 3) % USERS_INITIAL.length];
  const parent = USERS_INITIAL[(i * 2) % USERS_INITIAL.length];
  const exp = new Date();
  exp.setHours(exp.getHours() + (48 - (i * 6)));
  return {
    id: `pl-${100 + i}`,
    new_user_id: child.user_id,
    new_user_name: child.full_name,
    new_user_email: child.email,
    sponsor_id: parent.sponsor_id,
    sponsor_name: parent.full_name,
    status: i === 5 ? "EXPIRED" : "PENDING",
    requested_at: isoAgo(0, i * 3),
    expires_at: exp.toISOString(),
  };
});

export const LEVEL_BONUS_SLABS_INITIAL: LevelBonusSlab[] = [
  { pair_number: 1,  bonus_percent: 2.5, max_level: 1,  is_active: true },
  { pair_number: 2,  bonus_percent: 2.5, max_level: 2,  is_active: true },
  { pair_number: 3,  bonus_percent: 2.5, max_level: 3,  is_active: true },
  { pair_number: 4,  bonus_percent: 3.0, max_level: 4,  is_active: true },
  { pair_number: 5,  bonus_percent: 3.0, max_level: 5,  is_active: true },
  { pair_number: 6,  bonus_percent: 3.5, max_level: 6,  is_active: true },
  { pair_number: 7,  bonus_percent: 3.5, max_level: 7,  is_active: true },
  { pair_number: 8,  bonus_percent: 4.0, max_level: 8,  is_active: true },
  { pair_number: 9,  bonus_percent: 4.0, max_level: 9,  is_active: true },
  { pair_number: 10, bonus_percent: 5.0, max_level: 10, is_active: true },
];

/** commission_config seed values from 008_config.sql, shaped for the UI. */
export const COMMISSION_CONFIG_INITIAL: Array<{ key: string; value: string; updated_at: string }> = [
  { key: "direct_commission_percent",    value: "10",        updated_at: isoAgo(12) },
  { key: "binary_match_percent",         value: "10",        updated_at: isoAgo(12) },
  { key: "franchise_commission_percent", value: "10",        updated_at: isoAgo(18) },
  { key: "placement_hold_hours",         value: "48",        updated_at: isoAgo(6) },
  { key: "placement_weaker_by",          value: "subtree_bv", updated_at: isoAgo(6) },
];

export const P2P_TRANSFER_CONFIG_INITIAL: Array<{ key: string; value: string; updated_at: string }> = [
  { key: "p2p_service_charge_percent", value: "1",         updated_at: isoAgo(8) },
  { key: "p2p_min_amount_paise",       value: "10000",     updated_at: isoAgo(8) },
  { key: "p2p_max_amount_paise",       value: "5000000",   updated_at: isoAgo(8) },
  { key: "p2p_max_per_day_paise",      value: "2000000",   updated_at: isoAgo(8) },
  { key: "p2p_disabled",               value: "false",     updated_at: isoAgo(8) },
];

export type DashboardSliderImage = {
  id: string;
  image_url: string;
  caption: string;
  sort_order: number;
};

export type DashboardNotice = {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  active: boolean;
  updated_at: string;
};

export const DASHBOARD_SLIDER_IMAGES_INITIAL: DashboardSliderImage[] = [
  { id: "slide-1", image_url: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=70", caption: "New wellness packs — April promo", sort_order: 0 },
  { id: "slide-2", image_url: "https://images.unsplash.com/photo-1550572017-edd077b321cc?auto=format&fit=crop&w=1200&q=70", caption: "Binary matching explained", sort_order: 1 },
];

export const DASHBOARD_NOTICES_INITIAL: DashboardNotice[] = [
  {
    id: "notice-1",
    title: "Scheduled maintenance",
    body: "Wallet ledger may be read-only on Sunday 2–4 am IST.",
    link_url: "https://status.example.com",
    link_label: "Status page",
    active: true,
    updated_at: isoAgo(2),
  },
  {
    id: "notice-2",
    title: "KYC reminder",
    body: "Complete KYC to enable full withdrawal limits on your TEAM wallet.",
    link_url: null,
    link_label: null,
    active: true,
    updated_at: isoAgo(5),
  },
];

export const PAYOUT_CONFIG_INITIAL: Array<{ key: string; value: string; updated_at: string }> = [
  { key: "direct_wallet_allowed_dates",         value: "[5, 15, 25]",    updated_at: isoAgo(20) },
  { key: "direct_wallet_withdrawal_time_start", value: "10:00",        updated_at: isoAgo(20) },
  { key: "direct_wallet_withdrawal_time_end",   value: "18:00",        updated_at: isoAgo(20) },
  { key: "team_wallet_allowed_dates",           value: "[15, 25]",     updated_at: isoAgo(20) },
  { key: "team_wallet_withdrawal_time_start",   value: "10:00",        updated_at: isoAgo(20) },
  { key: "team_wallet_withdrawal_time_end",     value: "18:00",        updated_at: isoAgo(20) },
  { key: "allow_today",                         value: "false",        updated_at: isoAgo(20) },
  { key: "max_percent_of_monthly_income", value: "90",             updated_at: isoAgo(20) },
  { key: "min_withdrawal_amount",         value: "50000",          updated_at: isoAgo(20) },
];

const DOC_TYPES: KycDocument["document_type"][] = ["PAN_CARD", "AADHAAR_FRONT", "AADHAAR_BACK", "BANK_PASSBOOK"];
const BANK_NAMES = ["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "Yes Bank", "IDFC First Bank"];
const IFSC_PREFIXES = ["HDFC", "SBIN", "ICIC", "UTIB", "KKBK", "YESB", "IDFB"];
const SAMPLE_DOCS: Record<string, string> = {
  PAN_CARD:      "https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&w=640&q=60",
  AADHAAR_FRONT: "https://images.unsplash.com/photo-1605902711622-cfb43c4437b5?auto=format&fit=crop&w=640&q=60",
  AADHAAR_BACK:  "https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=640&q=60",
  BANK_PASSBOOK: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=640&q=60",
};

export const KYC_REQUESTS_INITIAL: KycRequestRow[] = USERS_INITIAL.slice(0, 14).map((u, i) => {
  const statusCycle: KycStatus[] = ["PENDING", "PENDING", "SUBMITTED", "SUBMITTED", "APPROVED", "REJECTED", "PENDING"];
  const status = statusCycle[i % statusCycle.length];
  const bankIdx = i % BANK_NAMES.length;
  const docs: KycDocument[] = status === "PENDING"
    ? []
    : DOC_TYPES.map((t, di) => ({
        document_id: `doc-${u.user_id}-${di}`,
        document_type: t,
        file_name: `${t.toLowerCase()}.jpg`,
        mime_type: "image/jpeg",
        file_size: 180_000 + di * 45_000,
        document_url: SAMPLE_DOCS[t] ?? SAMPLE_DOCS.PAN_CARD,
        uploaded_at: isoAgo(3 + i, 2 * di),
      }));
  return {
    kyc_id: `kyc-${String(1000 + i)}`,
    user_id: u.user_id,
    sponsor_id: u.sponsor_id,
    full_name: u.full_name,
    email: u.email,
    phone: u.phone,
    status,
    submitted_at: status === "PENDING" ? undefined : isoAgo(3 + i, 12),
    reviewed_at:  status === "APPROVED" || status === "REJECTED" ? isoAgo(1 + i, 6) : undefined,
    rejection_reason: status === "REJECTED" ? "Aadhaar back photo was blurry — please re-upload a clearer scan." : null,
    documents: docs,
    bank_account: status === "PENDING" ? null : {
      bank_name: BANK_NAMES[bankIdx],
      account_holder_name: u.full_name.toUpperCase(),
      account_number_masked: `XXXX XXXX ${String(4000 + i * 37).slice(-4)}`,
      ifsc: `${IFSC_PREFIXES[bankIdx]}0${String(100000 + i * 19).slice(-6)}`,
    },
  };
});

export const KYC_DOCUMENT_LABELS: Record<KycDocument["document_type"], string> = {
  PAN_CARD:      "PAN card",
  AADHAAR_CARD:  "Aadhaar card",
  AADHAAR_FRONT: "Aadhaar (front)",
  AADHAAR_BACK:  "Aadhaar (back)",
  BANK_PASSBOOK: "Bank passbook",
  OTHER:         "Other document",
};
