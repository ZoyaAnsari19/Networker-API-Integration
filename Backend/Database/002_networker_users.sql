-- ============================================================
-- Migration 002: Networker Users Table
-- FMCG-Binary MLM Platform
--
-- All monetary amounts stored in PAISE (1 INR = 100 paise).
-- ============================================================

-- Sponsor/referral code sequence (SPF00001...)
CREATE SEQUENCE IF NOT EXISTS sponsor_code_seq START 1;

CREATE TABLE IF NOT EXISTS networker_users (
    user_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Human-friendly unique sponsor id/code (SPF00001...) used everywhere externally
    sponsor_id           VARCHAR(8) NOT NULL DEFAULT ('SPF' || LPAD(nextval('sponsor_code_seq')::text, 5, '0')),
    -- Internal relationship to sponsor user (UUID) for joins/commissions/tree
    sponsor_user_id      UUID REFERENCES networker_users(user_id),
    full_name            VARCHAR(255) NOT NULL,
    email                VARCHAR(255) NOT NULL UNIQUE,
    phone                VARCHAR(20) UNIQUE,
    password_hash        VARCHAR(255) NOT NULL,
    status               user_status NOT NULL DEFAULT 'ACTIVE',
    role                 user_role NOT NULL DEFAULT 'NETWORKER',
    current_package_id   UUID,
    package_activated_at TIMESTAMPTZ,
    -- Monthly activation counters (v2 rule). income_period_ym is YYYY*100+MM
    -- (e.g. 202604) and is used to detect month rollover lazily on write.
    monthly_income_paise    BIGINT NOT NULL DEFAULT 0,
    monthly_shopping_paise  BIGINT NOT NULL DEFAULT 0,
    income_period_ym        INT NOT NULL DEFAULT (EXTRACT(YEAR FROM NOW())::int * 100 + EXTRACT(MONTH FROM NOW())::int),
    today_binary_earned  BIGINT NOT NULL DEFAULT 0,
    daily_binary_cap     BIGINT NOT NULL DEFAULT 0,
    placement_status     placement_status NOT NULL DEFAULT 'PLACED',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Profile / payouts (merged from former 014 + Secure Wallet display)
    avatar_object_key              TEXT,
    payout_upi_id                  VARCHAR(100),
    payout_bank_display            VARCHAR(200),
    secure_wallet_external_id      VARCHAR(128),
    secure_wallet_balance_paise    BIGINT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON networker_users (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON networker_users (phone);
CREATE INDEX IF NOT EXISTS idx_users_sponsor_user ON networker_users (sponsor_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sponsor_id ON networker_users (sponsor_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON networker_users (status);
CREATE INDEX IF NOT EXISTS idx_users_role ON networker_users (role);

-- Bootstrap: admin super user (non-networker admin)
INSERT INTO networker_users (user_id, sponsor_id, full_name, email, password_hash, role, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'SPF00000',
    'FMCG-Binary Admin',
    'admin@fmcgbinary.local',
    'SYSTEM_ACCOUNT_NO_LOGIN',
    'ADMIN',
    'ACTIVE'
) ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- v2 activation rule schema evolution (2026-04):
--   Drop old 7x/10x lifetime-cap columns, introduce monthly income / shopping
--   counters. Idempotent so a fresh DB created from the CREATE TABLE above is
--   a no-op and an existing DB gets migrated in place.
-- ---------------------------------------------------------------------------
ALTER TABLE networker_users DROP COLUMN IF EXISTS max_direct_cap;
ALTER TABLE networker_users DROP COLUMN IF EXISTS max_binary_cap;
ALTER TABLE networker_users DROP COLUMN IF EXISTS total_direct_earned;
ALTER TABLE networker_users DROP COLUMN IF EXISTS total_binary_earned;
ALTER TABLE networker_users ADD COLUMN IF NOT EXISTS monthly_income_paise BIGINT NOT NULL DEFAULT 0;
ALTER TABLE networker_users ADD COLUMN IF NOT EXISTS monthly_shopping_paise BIGINT NOT NULL DEFAULT 0;
ALTER TABLE networker_users
    ADD COLUMN IF NOT EXISTS income_period_ym INT NOT NULL
    DEFAULT (EXTRACT(YEAR FROM NOW())::int * 100 + EXTRACT(MONTH FROM NOW())::int);
CREATE INDEX IF NOT EXISTS idx_users_period ON networker_users (income_period_ym);
