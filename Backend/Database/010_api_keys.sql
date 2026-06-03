-- ============================================================
-- Migration 010: FMCG API Keys
-- FMCG-Binary MLM Platform
-- ============================================================

CREATE TABLE IF NOT EXISTS fmcg_api_keys (
    id         SERIAL PRIMARY KEY,
    app_name   VARCHAR(100) NOT NULL,
    api_key    VARCHAR(255) NOT NULL UNIQUE,
    api_secret VARCHAR(255) NOT NULL,
    status     api_key_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON fmcg_api_keys (api_key);

-- Seed the production callback credentials expected by FMCG.
-- Keep this aligned with Infra/k8s/02-secrets.yaml.
INSERT INTO fmcg_api_keys (app_name, api_key, api_secret)
VALUES (
    'Secure-Pharma FMCG',
    'fmcg_pk_3XsAQEjlx9UwsIw8QITBV1',
    'fmcg_sk_qjYW0MuoURDMLOPak5X9co2xE40m0y'
)
ON CONFLICT (api_key) DO UPDATE SET
    app_name = EXCLUDED.app_name,
    api_secret = EXCLUDED.api_secret,
    status = 'ACTIVE';
