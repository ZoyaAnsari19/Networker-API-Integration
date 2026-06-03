-- ============================================================
-- Migration 005: Wallet Ledger
-- FMCG-Binary MLM Platform
--
-- Source of truth for balances. No stored balance column.
-- Balance = SUM(CREDIT) - SUM(DEBIT) per (user_id, wallet_type).
-- Amounts in paise.
-- ============================================================

CREATE TABLE IF NOT EXISTS wallet_ledger (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES networker_users(user_id),
    wallet_type     wallet_type NOT NULL,
    amount          BIGINT NOT NULL CHECK (amount > 0),
    entry_type      entry_type NOT NULL,
    source          commission_source NOT NULL,
    reference_id    VARCHAR(255),
    reference_type  reference_type,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON wallet_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user_wallet ON wallet_ledger (user_id, wallet_type);
CREATE INDEX IF NOT EXISTS idx_ledger_user_wallet_entry ON wallet_ledger (user_id, wallet_type, entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON wallet_ledger (reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON wallet_ledger (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_source ON wallet_ledger (source);

-- Idempotency: prevent double-crediting for the same purchase order
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_idempotent
    ON wallet_ledger (user_id, wallet_type, source, reference_id)
    WHERE reference_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- v2 activation rule (2026-04): held_income quarantines commission rows that
-- were produced after a user crossed the Rs 25,000 monthly income threshold
-- but before that user met the Rs 2,500 monthly shopping requirement.
--
-- Status transitions:
--   HELD        -> RELEASED  (user shopped enough this month; released_ledger_id
--                             points at the wallet_ledger CREDIT that paid it
--                             out, ensuring one-to-one traceability)
--   HELD        -> FORFEITED (month rollover before shopping was completed)
--
-- Rows are written inside the same tx as the triggering purchase event, so
-- the (user_id, period_ym, status) composite index is the primary access
-- path for `ListHeldForRelease` (FOR UPDATE).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS held_income (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID NOT NULL REFERENCES networker_users(user_id),
    wallet_type         wallet_type NOT NULL,
    source              commission_source NOT NULL,
    amount              BIGINT NOT NULL CHECK (amount > 0),
    reference_id        VARCHAR(255),
    reference_type      reference_type,
    description         TEXT,
    period_ym           INT NOT NULL,
    status              held_income_status NOT NULL DEFAULT 'HELD',
    released_ledger_id  BIGINT REFERENCES wallet_ledger(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_held_income_user_period_status
    ON held_income (user_id, period_ym, status);
CREATE INDEX IF NOT EXISTS idx_held_income_status
    ON held_income (status);
