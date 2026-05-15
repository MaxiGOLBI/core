-- Export logs — track every CSV export made by the owner
-- Run ONCE in Supabase SQL editor

CREATE TABLE IF NOT EXISTS export_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT        NOT NULL,  -- 'ventas' | 'gastos' | 'stock' | etc.
  filters     JSONB       DEFAULT '{}',
  row_count   INTEGER     DEFAULT 0,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_logs_company
  ON export_logs (company_id, exported_at DESC);

ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_export_logs"
  ON export_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "dueno_select_export_logs"
  ON export_logs FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'dueno'
  );
