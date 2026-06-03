-- ============================================================
-- Migration 007: Pair Match Log & Daily Pair Stats
-- FMCG-Binary MLM Platform
-- ============================================================

CREATE TABLE IF NOT EXISTS pair_match_log (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID NOT NULL REFERENCES networker_users(user_id),
    left_bv_matched     BIGINT NOT NULL DEFAULT 0,
    right_bv_matched    BIGINT NOT NULL DEFAULT 0,
    matched_bv          BIGINT NOT NULL DEFAULT 0,
    carry_forward_bv    BIGINT NOT NULL DEFAULT 0,
    carry_forward_leg   tree_leg,
    commission_amount   BIGINT NOT NULL DEFAULT 0,
    level_bonus_amount  BIGINT NOT NULL DEFAULT 0,
    total_credited      BIGINT NOT NULL DEFAULT 0,
    cap_deducted        BIGINT NOT NULL DEFAULT 0,
    order_reference     VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pair_user ON pair_match_log (user_id);
CREATE INDEX IF NOT EXISTS idx_pair_created ON pair_match_log (created_at DESC);

CREATE TABLE IF NOT EXISTS daily_pair_stats (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               UUID NOT NULL REFERENCES networker_users(user_id),
    stat_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    pairs_today           INT NOT NULL DEFAULT 0,
    total_pairs_lifetime  INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_pair_stats_user_date ON daily_pair_stats (user_id, stat_date);
