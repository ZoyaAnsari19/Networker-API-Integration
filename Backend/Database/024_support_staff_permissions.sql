-- ============================================================
-- Migration 024: Grant support.* permissions to existing sub-admins
-- FMCG-Binary MLM Platform
--
-- Migration 023 created support ticket tables only. Permission keys
-- support.view / support.manage are enforced in Go (staff.go) but must
-- also exist in admin_staff_permissions for each SUB_ADMIN user.
--
-- Backfill rule (matches Admin UI "Support" preset intent):
--   Sub-admins who already have kyc.manage (typical support staff) receive
--   support.view + support.manage. Super-admin (ADMIN role) does not use
--   this table — ADMIN bypasses permission checks in middleware.
-- Idempotent: ON CONFLICT DO NOTHING.
-- ============================================================

INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'support.view', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'kyc.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;

INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'support.manage', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'kyc.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;

-- manage implies view (same pattern as migration 019).
INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'support.view', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'support.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;
