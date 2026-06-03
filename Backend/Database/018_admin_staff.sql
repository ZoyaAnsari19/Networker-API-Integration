-- ============================================================
-- Migration 018: Sub-admin (delegated staff)
-- FMCG-Binary MLM Platform
--
-- Adds the SUB_ADMIN role and a per-user permission table so an
-- existing ADMIN ("super admin") can delegate scoped admin access.
-- Sub-admins live as regular rows in networker_users with role =
-- 'SUB_ADMIN'; they have no MLM tree relationship (sponsor_user_id
-- stays NULL, placement_status defaults to PLACED).
-- ============================================================

-- 1. Extend user_role enum with SUB_ADMIN.
--    ALTER TYPE ... ADD VALUE IF NOT EXISTS must run outside a
--    transaction block; psql runs each statement in its own tx so
--    this is fine when applied via apply-sql.sh.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUB_ADMIN';

-- 2. Per-staff permissions. Keys mirror the Admin UI catalog
--    (Frontend/Admin/lib/sub-admin-permissions.ts). Validation of
--    permission_key happens in Go before insert so any drift between
--    UI and backend surfaces as a 400 instead of a silent grant.
CREATE TABLE IF NOT EXISTS admin_staff_permissions (
    user_id        UUID NOT NULL REFERENCES networker_users(user_id) ON DELETE CASCADE,
    permission_key VARCHAR(64) NOT NULL,
    granted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by     UUID REFERENCES networker_users(user_id),
    PRIMARY KEY (user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_staff_perm_user ON admin_staff_permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_perm_key  ON admin_staff_permissions (permission_key);

-- 3. Staff metadata on networker_users (nullable, idempotent).
--    staff_created_by is the super-admin that provisioned the row;
--    staff_last_login_at is bumped on each successful login when
--    role = 'SUB_ADMIN' so the admin UI can show "last seen".
ALTER TABLE networker_users
    ADD COLUMN IF NOT EXISTS staff_created_by    UUID REFERENCES networker_users(user_id);
ALTER TABLE networker_users
    ADD COLUMN IF NOT EXISTS staff_last_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_staff_created_by
    ON networker_users (staff_created_by)
    WHERE staff_created_by IS NOT NULL;
