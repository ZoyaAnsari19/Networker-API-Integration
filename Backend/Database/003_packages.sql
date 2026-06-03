-- ============================================================
-- Migration 003: Packages & User Packages
-- FMCG-Binary MLM Platform
--
-- Packages are admin-configurable. Amounts in paise.
-- ============================================================

CREATE TABLE IF NOT EXISTS packages (
    package_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  VARCHAR(100) NOT NULL,
    amount                BIGINT NOT NULL CHECK (amount > 0),
    -- v2 rule: packages only drive daily_binary_cap now. Lifetime cap
    -- multipliers were removed, so nothing else sits on this table.
    daily_binary_cap      BIGINT NOT NULL DEFAULT 0,
    status                package_status NOT NULL DEFAULT 'ACTIVE',
    sort_order            INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_status ON packages (status);

-- FK from networker_users now that packages table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_users_package'
  ) THEN
    ALTER TABLE networker_users
      ADD CONSTRAINT fk_users_package
      FOREIGN KEY (current_package_id) REFERENCES packages(package_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS user_packages (
    id            BIGSERIAL PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES networker_users(user_id),
    package_id    UUID NOT NULL REFERENCES packages(package_id),
    amount_paid   BIGINT NOT NULL,
    activated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expired_at    TIMESTAMPTZ,
    status        user_package_status NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_packages_user ON user_packages (user_id);
CREATE INDEX IF NOT EXISTS idx_user_packages_status ON user_packages (status);

-- ---------------------------------------------------------------------------
-- v2 activation rule evolution (2026-04): drop the lifetime cap multipliers
-- since packages no longer bound total direct / binary income.
-- ---------------------------------------------------------------------------
ALTER TABLE packages DROP COLUMN IF EXISTS direct_cap_multiplier;
ALTER TABLE packages DROP COLUMN IF EXISTS binary_cap_multiplier;
