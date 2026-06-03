-- ============================================================
-- Migration 023: Support Ticket system
-- FMCG-Binary MLM Platform
--
-- Three tables:
--   support_pre_questions     "Topics" shown in the New Ticket UI (ADMIN-only CRUD)
--   support_tickets           ticket header (one row per ticket)
--   support_ticket_messages   thread messages (user/admin/system)
--
-- Rules enforced in Go (not in DB):
--   - user can close own ticket (any status -> closed).
--   - ADMIN can close any ticket.
--   - SUB_ADMIN can close only when assigned_to == sub_admin_user_id.
--   - Only ADMIN can change assigned_to to a different user (reassign).
--   - SUB_ADMIN / ADMIN can `assign-to-me`; status flips open -> in_progress.
--   - Once status = 'closed', new messages and attachment uploads are rejected.
-- ============================================================

-- 1. Status enum for tickets.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_status') THEN
    CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_sender_type') THEN
    CREATE TYPE support_sender_type AS ENUM ('user', 'admin', 'system');
  END IF;
END
$$;

-- 2. Topics ("pre-questions"). Super Admin manages CRUD via /api/v1/admin/support/topics.
CREATE TABLE IF NOT EXISTS support_pre_questions (
    id          SERIAL      PRIMARY KEY,
    question    VARCHAR(200) NOT NULL,
    category    VARCHAR(80),
    sort_order  INT         NOT NULL DEFAULT 0,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_topics_active_sort
    ON support_pre_questions (is_active, sort_order, id);

-- 3. Ticket header. user_id = networker who raised it. assigned_to = staff user
--    once assigned (ADMIN or SUB_ADMIN). closed_by_user_id is whoever closed.
CREATE TABLE IF NOT EXISTS support_tickets (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES networker_users(user_id) ON DELETE CASCADE,
    pre_question_id    INT  REFERENCES support_pre_questions(id) ON DELETE SET NULL,
    subject            VARCHAR(200),
    status             support_ticket_status NOT NULL DEFAULT 'open',
    assigned_to        UUID REFERENCES networker_users(user_id),
    closed_at          TIMESTAMPTZ,
    closed_by_user_id  UUID REFERENCES networker_users(user_id),
    last_message_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user            ON support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created  ON support_tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned        ON support_tickets (assigned_to)
    WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_unassigned_open ON support_tickets (created_at DESC)
    WHERE assigned_to IS NULL AND status <> 'closed';

-- 4. Conversation messages. attachment_urls is a JSONB array of
--    { url, type, filename } objects. URLs are presigned at READ time —
--    the column stores the canonical link returned by the upload service.
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id              BIGSERIAL PRIMARY KEY,
    ticket_id       UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type     support_sender_type NOT NULL,
    sender_user_id  UUID REFERENCES networker_users(user_id),
    message_text    TEXT,
    attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (message_text IS NOT NULL AND length(btrim(message_text)) > 0)
        OR jsonb_array_length(attachment_urls) > 0
    )
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
    ON support_ticket_messages (ticket_id, created_at);
