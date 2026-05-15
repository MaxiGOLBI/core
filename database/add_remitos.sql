-- Remitos de venta (delivery notes)
-- Run ONCE in Supabase SQL editor

CREATE TABLE IF NOT EXISTS remitos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id     UUID        REFERENCES branches(id) ON DELETE SET NULL,
  sale_id       UUID        REFERENCES sales(id)    ON DELETE SET NULL,

  number        TEXT        DEFAULT NULL,  -- remito number (e.g. "R-0001")
  client_name   TEXT        DEFAULT '',
  client_address TEXT       DEFAULT '',
  items         JSONB       NOT NULL DEFAULT '[]',
  notes         TEXT        DEFAULT '',

  delivered_at  DATE        DEFAULT NULL,
  signed_by     TEXT        DEFAULT '',  -- name of who signed on delivery

  created_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remitos_company
  ON remitos (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remitos_sale
  ON remitos (sale_id);

ALTER TABLE remitos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_remitos"
  ON remitos FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "users_select_remitos"
  ON remitos FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
