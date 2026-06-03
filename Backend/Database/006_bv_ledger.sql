-- ============================================================
-- Migration 006: BV Ledger
-- FMCG-Binary MLM Platform
--
-- Audit trail of individual BV entries flowing up the tree.
-- Carry forward is NOT a per-entry status; it is the running
-- total on binary_tree.left_bv / right_bv.
-- ============================================================

CREATE TABLE IF NOT EXISTS bv_ledger (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES networker_users(user_id),
    source_user_id  UUID NOT NULL REFERENCES networker_users(user_id),
    leg             tree_leg NOT NULL,
    bv_amount       BIGINT NOT NULL CHECK (bv_amount > 0),
    order_reference VARCHAR(255),
    status          bv_status NOT NULL DEFAULT 'UNMATCHED',
    matched_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bv_user ON bv_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_bv_user_leg ON bv_ledger (user_id, leg);
CREATE INDEX IF NOT EXISTS idx_bv_status ON bv_ledger (status);
CREATE INDEX IF NOT EXISTS idx_bv_order ON bv_ledger (order_reference);
CREATE INDEX IF NOT EXISTS idx_bv_unmatched ON bv_ledger (user_id, leg) WHERE status = 'UNMATCHED';
