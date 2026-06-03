-- ============================================================
-- Migration 025: Leaderboard read-performance indexes
-- FMCG-Binary MLM Platform
--
-- Read-only aggregates for GET /api/v1/leaderboards.
-- Does not change any write paths or business logic.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bv_ledger_created_at ON bv_ledger (created_at);
CREATE INDEX IF NOT EXISTS idx_bv_ledger_source_user ON bv_ledger (source_user_id);
CREATE INDEX IF NOT EXISTS idx_bv_ledger_user_created ON bv_ledger (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pair_user_created ON pair_match_log (user_id, created_at);
