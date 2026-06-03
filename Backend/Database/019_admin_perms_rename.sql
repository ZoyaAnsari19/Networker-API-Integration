-- ============================================================
-- Migration 019: Rename sub-admin permission keys (view/manage model)
-- FMCG-Binary MLM Platform
--
-- Maps legacy granular keys to module.view / module.manage keys.
-- dashboard.read is dropped (dashboard is default for all staff).
-- Idempotent: safe to re-run; unknown keys are left unchanged.
-- ============================================================

-- users.write and users.wallet both map to networker.manage — drop wallet when write exists.
DELETE FROM admin_staff_permissions AS w
USING admin_staff_permissions AS wr
WHERE w.user_id = wr.user_id
  AND w.permission_key = 'users.wallet'
  AND wr.permission_key = 'users.write';

UPDATE admin_staff_permissions
SET permission_key = CASE permission_key
    WHEN 'users.read' THEN 'networker.view'
    WHEN 'users.write' THEN 'networker.manage'
    WHEN 'users.wallet' THEN 'networker.manage'
    WHEN 'placement.read' THEN 'placement.view'
    WHEN 'placement.write' THEN 'placement.manage'
    WHEN 'kyc.read' THEN 'kyc.view'
    WHEN 'kyc.write' THEN 'kyc.manage'
    WHEN 'payouts.read' THEN 'withdraw.view'
    WHEN 'payouts.approve' THEN 'withdraw.manage'
    WHEN 'reports.ledger' THEN 'ledger.view'
    WHEN 'reports.income_direct' THEN 'income_direct.view'
    WHEN 'reports.income_binary' THEN 'income_binary.view'
    WHEN 'config.packages' THEN 'packages.manage'
    WHEN 'config.notifications' THEN 'notifications.manage'
    WHEN 'config.platform' THEN 'platform_config.manage'
    ELSE permission_key
END
WHERE permission_key IN (
    'users.read', 'users.write', 'users.wallet',
    'placement.read', 'placement.write',
    'kyc.read', 'kyc.write',
    'payouts.read', 'payouts.approve',
    'reports.ledger', 'reports.income_direct', 'reports.income_binary',
    'config.packages', 'config.notifications', 'config.platform'
);

-- Dashboard is implicit for all staff; drop legacy key (NOT NULL column — delete, do not SET NULL).
DELETE FROM admin_staff_permissions WHERE permission_key = 'dashboard.read';

-- Legacy manage-only rows may lack view; grant view for any manage key present.
INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'networker.view', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'networker.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;

INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'placement.view', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'placement.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;

INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'kyc.view', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'kyc.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;

INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'withdraw.view', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'withdraw.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;

INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'packages.view', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'packages.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;

INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'notifications.view', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'notifications.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;

INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
SELECT DISTINCT user_id, 'platform_config.view', granted_by
FROM admin_staff_permissions
WHERE permission_key = 'platform_config.manage'
ON CONFLICT (user_id, permission_key) DO NOTHING;
