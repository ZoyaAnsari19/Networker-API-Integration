-- ============================================================
-- Migration 004: Binary Tree
-- FMCG-Binary MLM Platform
--
-- Separate from sponsor relationship. parent_id is the binary
-- parent (placement), not the sponsor.
-- left_bv / right_bv are running totals of UNMATCHED BV
-- (carry forward).
-- ============================================================

CREATE TABLE IF NOT EXISTS binary_tree (
    id             BIGSERIAL PRIMARY KEY,
    user_id        UUID NOT NULL UNIQUE REFERENCES networker_users(user_id),
    parent_id      UUID REFERENCES networker_users(user_id),
    leg            tree_leg,
    left_child_id  UUID REFERENCES networker_users(user_id),
    right_child_id UUID REFERENCES networker_users(user_id),
    left_bv        BIGINT NOT NULL DEFAULT 0,
    right_bv       BIGINT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tree_user ON binary_tree (user_id);
CREATE INDEX IF NOT EXISTS idx_tree_parent ON binary_tree (parent_id);
CREATE INDEX IF NOT EXISTS idx_tree_left_child ON binary_tree (left_child_id);
CREATE INDEX IF NOT EXISTS idx_tree_right_child ON binary_tree (right_child_id);

-- ============================================================
-- Placement Requests (48h hold for FMCG self-signups)
-- ============================================================

CREATE TABLE IF NOT EXISTS placement_requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL UNIQUE REFERENCES networker_users(user_id),
    sponsor_user_id  UUID NOT NULL REFERENCES networker_users(user_id),
    status           placement_request_status NOT NULL DEFAULT 'PENDING',
    decided_leg      tree_leg,
    decided_by       UUID REFERENCES networker_users(user_id),
    expires_at       TIMESTAMPTZ NOT NULL,
    decided_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_sponsor_pending ON placement_requests (sponsor_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pr_expiry ON placement_requests (status, expires_at);

-- ============================================================
-- Pending BV Hold (binary BV parked while user is unplaced)
-- ============================================================

CREATE TABLE IF NOT EXISTS pending_bv_hold (
    id               BIGSERIAL PRIMARY KEY,
    source_user_id   UUID NOT NULL REFERENCES networker_users(user_id),
    order_reference  VARCHAR(128) NOT NULL,
    bv_amount        BIGINT NOT NULL,
    status           VARCHAR(16) NOT NULL DEFAULT 'HELD',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pbh_user ON pending_bv_hold (source_user_id, status);
