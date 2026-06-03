-- ============================================================
-- Migration 011: Audit Logs
-- FMCG-Binary MLM Platform
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID NOT NULL REFERENCES networker_users(user_id),
    action      VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id   VARCHAR(255) NOT NULL,
    details     JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
