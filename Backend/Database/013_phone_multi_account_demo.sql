-- Allow multiple networker_users rows with phone +918600000889 (IN 8600000889) for QA.
-- Replaces table-level UNIQUE(phone) with a partial unique index.

ALTER TABLE networker_users DROP CONSTRAINT IF EXISTS networker_users_phone_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique_except_demo
    ON networker_users (phone) WHERE phone IS NOT NULL AND phone <> '+918600000889';
