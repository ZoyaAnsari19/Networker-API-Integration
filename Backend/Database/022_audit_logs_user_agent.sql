-- Migration 022: store browser user-agent on audit_logs (sub-admin activity forensics)

ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS user_agent TEXT;
