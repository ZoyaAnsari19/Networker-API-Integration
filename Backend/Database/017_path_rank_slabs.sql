-- ============================================================
-- Migration 017: Path Rank slabs (career / achievement ranks)
-- Qualification is based on BV from direct referrals (bv_ledger).
-- ============================================================

CREATE TABLE IF NOT EXISTS path_rank_slabs (
    rank_level           INT PRIMARY KEY CHECK (rank_level >= 1),
    name                 VARCHAR(50) NOT NULL,
    min_direct_bv_paise  BIGINT NOT NULL DEFAULT 0 CHECK (min_direct_bv_paise >= 0),
    min_lifetime_pairs   INT NOT NULL DEFAULT 0 CHECK (min_lifetime_pairs >= 0),
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default progression (amounts in paise; admin can change later via SQL or future API)
INSERT INTO path_rank_slabs (rank_level, name, min_direct_bv_paise, min_lifetime_pairs) VALUES
    (1, 'Starter',   0,          0),
    (2, 'Bronze',    5000000,    0),
    (3, 'Silver',    20000000,   0),
    (4, 'Gold',      75000000,   0),
    (5, 'Platinum',  250000000,  0),
    (6, 'Diamond',   1000000000, 0)
ON CONFLICT (rank_level) DO NOTHING;
