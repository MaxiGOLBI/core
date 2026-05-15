-- Suppliers (proveedores) with balance tracking
-- Run ONCE in Supabase SQL editor

-- ============================================================
-- 1. suppliers — master table
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  cuit        TEXT        DEFAULT '',
  phone       TEXT        DEFAULT '',
  email       TEXT        DEFAULT '',
  address     TEXT        DEFAULT '',
  notes       TEXT        DEFAULT '',
  -- Running balance: positive = we owe them, negative = they owe us
  balance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company
  ON suppliers (company_id, name);

-- ============================================================
-- 2. supplier_transactions — debts and payments history
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_transactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id  UUID        NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,

  -- 'deuda': we owe them (increases balance)
  -- 'pago':  we paid them (decreases balance)
  type         TEXT        NOT NULL CHECK (type IN ('deuda', 'pago')),

  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT      DEFAULT NULL,  -- only relevant for 'pago'
  reference    TEXT        DEFAULT '',    -- invoice number, remito, etc.
  notes        TEXT        DEFAULT '',

  created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier
  ON supplier_transactions (supplier_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_company
  ON supplier_transactions (company_id, date DESC);

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_suppliers"
  ON suppliers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_supplier_transactions"
  ON supplier_transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "users_select_suppliers"
  ON suppliers FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "users_select_supplier_transactions"
  ON supplier_transactions FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
