-- Add payment method, sale status and credit_notes table.
-- Run ONCE in Supabase SQL editor.

-- ============================================================
-- 1. Add payment fields to sales
-- ============================================================
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'efectivo';
-- Stores split breakdown as JSON, e.g. {"efectivo": 500, "tarjeta": 300}
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_breakdown JSONB DEFAULT NULL;
-- Sale lifecycle: completed | cancelled
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- ============================================================
-- 2. Create credit_notes table
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     UUID REFERENCES sales(id) ON DELETE SET NULL,
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  amount      NUMERIC(12,2) NOT NULL,
  reason      TEXT DEFAULT 'Cancelación de venta',
  status      TEXT DEFAULT 'pending',   -- pending | used
  company_id  UUID REFERENCES companies(id),
  branch_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for credit_notes
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_credit_notes"
  ON credit_notes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "users_select_credit_notes"
  ON credit_notes FOR SELECT TO authenticated
  USING (company_id = get_my_company_id());

CREATE POLICY "users_insert_credit_notes"
  ON credit_notes FOR INSERT TO authenticated
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "users_update_credit_notes"
  ON credit_notes FOR UPDATE TO authenticated
  USING      (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());
