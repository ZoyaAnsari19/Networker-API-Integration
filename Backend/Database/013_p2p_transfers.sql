-- ============================================================
-- Migration 013: Peer-to-Peer (Networker ↔ Networker) Transfers
-- FMCG-Binary MLM Platform
--
-- A P2P transfer moves value between two ACTIVE networkers' Main
-- (DIRECT) wallets. The platform charges a configurable service
-- fee on every transfer; sender is debited for the full gross
-- amount and the receiver is credited with (amount - fee). The
-- fee retention is implicit in the ledger — sender DEBIT (gross)
-- and receiver CREDIT (net) don't cancel out; the difference is
-- retained by the platform and recorded per-transfer for audit.
--
-- 1. Extend commission_source enum with P2P_TRANSFER so we can tag
--    ledger rows and filter history.
-- 2. Extend reference_type enum with P2P so the UI can link a
--    ledger row back to a p2p_transfers row.
-- 3. Create p2p_transfers for first-class transfer history +
--    service-charge accounting (independent of ledger so balances
--    stay correct while fees remain auditable).
-- 4. Seed p2p_* commission_config entries (admin can tweak live):
--       p2p_enabled                       → bool
--       p2p_min_amount_paise              → min transfer in paise
--       p2p_service_charge_percent        → percent of gross amount
-- ============================================================

-- 1. Extend commission_source ----------------------------------
ALTER TYPE commission_source ADD VALUE IF NOT EXISTS 'P2P_TRANSFER';

-- 2. Extend reference_type -------------------------------------
ALTER TYPE reference_type ADD VALUE IF NOT EXISTS 'P2P';

-- 3. p2p_transfers ---------------------------------------------
CREATE TABLE IF NOT EXISTS p2p_transfers (
    transfer_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id      UUID NOT NULL REFERENCES networker_users(user_id),
    receiver_user_id    UUID NOT NULL REFERENCES networker_users(user_id),
    sender_sponsor_id   VARCHAR(32) NOT NULL,
    receiver_sponsor_id VARCHAR(32) NOT NULL,
    wallet_type         wallet_type NOT NULL DEFAULT 'DIRECT',
    amount              BIGINT NOT NULL CHECK (amount > 0),
    service_charge      BIGINT NOT NULL DEFAULT 0 CHECK (service_charge >= 0),
    net_amount          BIGINT NOT NULL CHECK (net_amount > 0),
    note                TEXT,
    debit_ledger_id     BIGINT REFERENCES wallet_ledger(id),
    credit_ledger_id    BIGINT REFERENCES wallet_ledger(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (sender_user_id <> receiver_user_id),
    CHECK (net_amount + service_charge = amount)
);

CREATE INDEX IF NOT EXISTS idx_p2p_sender    ON p2p_transfers (sender_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_p2p_receiver  ON p2p_transfers (receiver_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_p2p_created   ON p2p_transfers (created_at DESC);

-- 4. Seed p2p_* config -----------------------------------------
-- Defaults: enabled, min ₹100 (10 000 paise), 2% service charge.
INSERT INTO commission_config (config_key, config_value) VALUES
    ('p2p_enabled',                '{"value": true}'::jsonb),
    ('p2p_min_amount_paise',       '{"value": 10000}'::jsonb),
    ('p2p_service_charge_percent', '{"value": 2}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;
