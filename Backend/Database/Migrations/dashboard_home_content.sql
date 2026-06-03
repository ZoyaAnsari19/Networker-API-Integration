-- Single-row store for admin-managed networker dashboard marketing (slider + notices).

CREATE TABLE IF NOT EXISTS dashboard_home_content (
    id             SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    slider_slides  JSONB        NOT NULL DEFAULT '[]'::jsonb,
    notices        JSONB        NOT NULL DEFAULT '[]'::jsonb,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO dashboard_home_content (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
