-- ============================================================
-- Migration 012: Transaction password + KYC
-- FMCG-Binary MLM Platform
--
-- 1. networker_users.transaction_password_hash: bcrypt hash of the
--    networker's transaction password. Used to authorise P2P transfers
--    (networker → networker wallet movements) and other high-risk
--    actions. Nullable so existing users can migrate in place; UI
--    shows a "Set transaction password" state until populated.
--
-- 2. KYC tables mirror the Secure-Coin design (kyc_requests /
--    kyc_documents) so we can reuse the same admin review flow and
--    Backblaze B2 upload path. rejection_reason is surfaced to the
--    user so they know what to fix before re-submitting.
-- ============================================================

ALTER TABLE networker_users
    ADD COLUMN IF NOT EXISTS transaction_password_hash VARCHAR(255);

DO $$ BEGIN
    CREATE TYPE kyc_status AS ENUM (
        'PENDING',
        'SUBMITTED',
        'APPROVED',
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE kyc_document_type AS ENUM (
        'PAN_CARD',
        'AADHAAR_CARD',
        'AADHAAR_FRONT',
        'AADHAAR_BACK',
        'BANK_PASSBOOK',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS kyc_requests (
    kyc_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL UNIQUE REFERENCES networker_users(user_id) ON DELETE CASCADE,
    status           kyc_status NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    admin_id         UUID REFERENCES networker_users(user_id),
    submitted_at     TIMESTAMPTZ,
    reviewed_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_requests_user_id ON kyc_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status  ON kyc_requests (status);

CREATE TABLE IF NOT EXISTS kyc_documents (
    document_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kyc_id        UUID NOT NULL REFERENCES kyc_requests(kyc_id) ON DELETE CASCADE,
    document_type kyc_document_type NOT NULL,
    document_url  TEXT NOT NULL,
    file_name     VARCHAR(500),
    file_size     BIGINT,
    mime_type     VARCHAR(100),
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_kyc_id ON kyc_documents (kyc_id);
