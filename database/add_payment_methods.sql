-- ============================================================
-- Payment methods (custom, managed per company by owner)
-- Run this in the Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     UUID NOT NULL,
  name           TEXT NOT NULL,
  commission_pct NUMERIC(5,2) DEFAULT 0 CHECK (commission_pct >= 0 AND commission_pct <= 100),
  active         BOOLEAN DEFAULT TRUE,
  sort_order     INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, name)
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can read payment methods"
  ON payment_methods FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Dueno can manage payment methods"
  ON payment_methods FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'dueno'
  );
