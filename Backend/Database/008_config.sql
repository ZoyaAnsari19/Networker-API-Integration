-- ============================================================
-- Migration 008: Commission Config & Level Bonus Slabs
-- FMCG-Binary MLM Platform
-- ============================================================

CREATE TABLE IF NOT EXISTS commission_config (
    id           SERIAL PRIMARY KEY,
    config_key   VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL DEFAULT '{}',
    updated_by   UUID REFERENCES networker_users(user_id),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default configuration
INSERT INTO commission_config (config_key, config_value) VALUES
    ('direct_commission_percent', '{"value": 10}'::jsonb),
    ('binary_match_percent', '{"value": 10}'::jsonb),
    ('franchise_commission_percent', '{"value": 10}'::jsonb),
    ('carry_forward_flush_enabled', '{"value": false}'::jsonb),
    ('carry_forward_flush_period', '{"value": "never"}'::jsonb),
    ('ratio_rule_enabled', '{"value": false}'::jsonb),
    ('ratio_rule_max', '{"value": 0}'::jsonb),
    ('placement_hold_hours', '{"value": 48}'::jsonb),
    ('placement_weaker_by', '{"value": "subtree_bv"}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS level_bonus_slabs (
    id            SERIAL PRIMARY KEY,
    pair_number   INT NOT NULL,
    bonus_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    max_level     INT NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (pair_number)
);

-- Seed default level bonus slabs (admin can change via API)
INSERT INTO level_bonus_slabs (pair_number, bonus_percent, max_level) VALUES
    (1,  2.50, 1),
    (2,  2.50, 2),
    (3,  2.50, 3),
    (4,  3.00, 4),
    (5,  3.00, 5),
    (6,  3.50, 6),
    (7,  3.50, 7),
    (8,  4.00, 8),
    (9,  4.00, 9),
    (10, 5.00, 10)
ON CONFLICT (pair_number) DO NOTHING;

CREATE TABLE IF NOT EXISTS payout_config (
    id           SERIAL PRIMARY KEY,
    config_key   VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL DEFAULT '{}',
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO payout_config (config_key, config_value) VALUES
    ('allowed_dates', '{"value": [5, 15, 25]}'::jsonb),
    ('max_percent_of_monthly_income', '{"value": 100}'::jsonb),
    ('min_withdrawal_amount', '{"value": 50000}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;
