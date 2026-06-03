-- ============================================================
-- Migration 020: Split platform_config.view/manage into per-tab manage keys
-- FMCG-Binary MLM Platform
--
-- Replaces platform_config.view and platform_config.manage with four
-- manage-only tab permissions (no view keys).
-- Idempotent: safe to re-run.
-- ============================================================

DELETE FROM admin_staff_permissions WHERE permission_key = 'platform_config.view';

-- Users with legacy full platform manage receive all four tab permissions.
INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'platform_config.commission_placement.manage', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'platform_config.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;

INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'platform_config.withdrawals.manage', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'platform_config.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;

INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'platform_config.p2p.manage', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'platform_config.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;

INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'platform_config.level_bonus.manage', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'platform_config.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;

DELETE FROM admin_staff_permissions WHERE permission_key = 'platform_config.manage';
