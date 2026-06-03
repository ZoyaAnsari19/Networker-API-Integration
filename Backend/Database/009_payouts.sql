-- ============================================================
-- Migration 009: Payout Requests + withdrawal config
-- FMCG-Binary MLM Platform
--
-- Amounts in paise. Payouts are issued to the user's Secure Wallet only
-- (see payout_service + SecureCoin client). payment_method is stored for
-- audit; networker UI uses SECURE_WALLET.
--
-- Merged: former 014 (fee columns, payout_config keys) lives here so a
-- fresh database only needs migrations 001–013 + this file (014 removed).
-- ============================================================

CREATE TABLE IF NOT EXISTS payout_requests (
    payout_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES networker_users(user_id),
    wallet_type            wallet_type NOT NULL,
    requested_amount       BIGINT NOT NULL CHECK (requested_amount > 0),
    service_charge_paise   BIGINT NOT NULL DEFAULT 0,
    tds_paise              BIGINT NOT NULL DEFAULT 0,
    net_payout_paise       BIGINT NOT NULL DEFAULT 0,
    payment_method         VARCHAR(20) NOT NULL DEFAULT 'SECURE_WALLET',
    approved_amount        BIGINT,
    status                 payout_status NOT NULL DEFAULT 'PENDING',
    admin_id               UUID REFERENCES networker_users(user_id),
    admin_note             TEXT,
    sc_tx_reference        VARCHAR(255),
    sc_user_email          VARCHAR(255),
    requested_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at           TIMESTAMPTZ,
    CONSTRAINT chk_payout_net_nonneg CHECK (net_payout_paise >= 0),
    CONSTRAINT chk_payout_fees_lte_gross CHECK (service_charge_paise + tds_paise <= requested_amount)
);

CREATE INDEX IF NOT EXISTS idx_payout_user ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requested ON payout_requests(requested_at DESC);

-- Withdrawal scheduling / fee defaults (admin-tunable via payout_config)
INSERT INTO payout_config (config_key, config_value) VALUES
    ('withdrawal_ist_start_hour', '{"value": 10}'::jsonb),
    ('withdrawal_ist_end_hour', '{"value": 17}'::jsonb),
    ('withdrawal_service_charge_percent', '{"value": 0.5}'::jsonb),
    ('withdrawal_tds_percent', '{"value": 1.0}'::jsonb),
    ('withdrawal_allowed_dates_direct', '{"value": [10, 20, 30]}'::jsonb),
    ('withdrawal_allowed_dates_team', '{"value": [10, 20, 30]}'::jsonb),
    ('withdrawal_max_percent_of_monthly_income', '{"value": 100}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

-- Fresh installs: 008 seeds max_percent at 90; withdrawals use 100 = no cap vs monthly income.
UPDATE payout_config SET config_value = '{"value": 100}'::jsonb, updated_at = NOW()
WHERE config_key = 'max_percent_of_monthly_income';
