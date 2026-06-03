-- ============================================================
-- Migration 021: Sub-admin step-up action PIN (6-digit, plain text in staff_action_pin_hash)
-- FMCG-Binary MLM Platform
--
-- Super admin sets a unique PIN per SUB_ADMIN. High-risk admin writes
-- require action_pin in the request body; verified against this hash.
-- ============================================================

ALTER TABLE networker_users
    ADD COLUMN IF NOT EXISTS staff_action_pin_hash TEXT;
