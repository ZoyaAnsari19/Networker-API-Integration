-- 012: Secure Coin wallet link columns on networker_users (idempotent).
-- Run once on existing DBs that were created before 002 included these
-- alters, e.g.:
--   psql "$DATABASE_URL" -f Backend/Database/012_secure_coin_wallet_link.sql

ALTER TABLE networker_users ADD COLUMN IF NOT EXISTS sc_wallet_code VARCHAR(128);
ALTER TABLE networker_users ADD COLUMN IF NOT EXISTS sc_linked_at   TIMESTAMPTZ;
ALTER TABLE networker_users DROP COLUMN IF EXISTS sc_balance_sc;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sc_wallet_code
    ON networker_users (sc_wallet_code) WHERE sc_wallet_code IS NOT NULL;
