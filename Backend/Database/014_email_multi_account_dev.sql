-- Allow multiple networker_users rows with developer email faizanvector@gmail.com (QA).
-- Replaces table-level UNIQUE(email) with a partial unique index on lower(trim(email)).

ALTER TABLE networker_users DROP CONSTRAINT IF EXISTS networker_users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique_except_dev
    ON networker_users (lower(trim(email::text)))
    WHERE lower(trim(email::text)) <> 'faizanvector@gmail.com';
