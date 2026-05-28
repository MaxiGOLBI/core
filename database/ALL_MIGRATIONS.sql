-- ============================================================
-- ALL_MIGRATIONS.sql
-- Pegar completo en Supabase SQL Editor y ejecutar UNA SOLA VEZ.
-- Todas las sentencias usan IF NOT EXISTS / IF EXISTS para ser idempotentes.
-- ============================================================

-- ============================================================
-- MIGRACIÓN 1 — Caja (cash_sessions + cash_movements)
-- ============================================================

CREATE TABLE IF NOT EXISTS cash_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id        UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  opening_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_amount   NUMERIC(12,2) DEFAULT NULL,
  expected_amount  NUMERIC(12,2) DEFAULT NULL,
  difference       NUMERIC(12,2) DEFAULT NULL,
  status           TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes            TEXT        DEFAULT '',
  opened_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  closed_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  opened_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_branch_status ON cash_sessions (branch_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_company_opened ON cash_sessions (company_id, opened_at DESC);

CREATE TABLE IF NOT EXISTS cash_movements (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID        NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id    UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL CHECK (type IN ('sale', 'expense', 'manual_in', 'manual_out')),
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description  TEXT        DEFAULT '',
  sale_id      UUID        REFERENCES sales(id) ON DELETE SET NULL,
  expense_id   UUID        REFERENCES expenses(id) ON DELETE SET NULL,
  created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements (session_id, created_at);

ALTER TABLE cash_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cash_sessions'  AND policyname='service_role_cash_sessions')  THEN
    CREATE POLICY "service_role_cash_sessions"  ON cash_sessions  FOR ALL TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cash_movements' AND policyname='service_role_cash_movements') THEN
    CREATE POLICY "service_role_cash_movements" ON cash_movements FOR ALL TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cash_sessions'  AND policyname='users_select_cash_sessions')  THEN
    CREATE POLICY "users_select_cash_sessions"  ON cash_sessions  FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cash_movements' AND policyname='users_select_cash_movements') THEN
    CREATE POLICY "users_select_cash_movements" ON cash_movements FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())); END IF;
END $$;

-- ============================================================
-- MIGRACIÓN 2 — Proveedores (suppliers + supplier_transactions)
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
  balance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers (company_id, name);

CREATE TABLE IF NOT EXISTS supplier_transactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id  UUID        NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL CHECK (type IN ('deuda', 'pago')),
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT      DEFAULT NULL,
  reference    TEXT        DEFAULT '',
  notes        TEXT        DEFAULT '',
  created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier ON supplier_transactions (supplier_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_company  ON supplier_transactions (company_id, date DESC);

ALTER TABLE suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='suppliers' AND policyname='service_role_suppliers') THEN
    CREATE POLICY "service_role_suppliers" ON suppliers FOR ALL TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='supplier_transactions' AND policyname='service_role_supplier_transactions') THEN
    CREATE POLICY "service_role_supplier_transactions" ON supplier_transactions FOR ALL TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='suppliers' AND policyname='users_select_suppliers') THEN
    CREATE POLICY "users_select_suppliers" ON suppliers FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='supplier_transactions' AND policyname='users_select_supplier_transactions') THEN
    CREATE POLICY "users_select_supplier_transactions" ON supplier_transactions FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())); END IF;
END $$;

-- ============================================================
-- MIGRACIÓN 3 — Transferencias de stock
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_transfers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_branch_id  UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  to_branch_id    UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty             INTEGER     NOT NULL CHECK (qty > 0),
  status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes           TEXT        DEFAULT '',
  requested_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  resolved_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_company ON stock_transfers (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status  ON stock_transfers (company_id, status);

ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stock_transfers' AND policyname='service_role_stock_transfers') THEN
    CREATE POLICY "service_role_stock_transfers" ON stock_transfers FOR ALL TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stock_transfers' AND policyname='users_select_stock_transfers') THEN
    CREATE POLICY "users_select_stock_transfers" ON stock_transfers FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())); END IF;
END $$;

-- ============================================================
-- MIGRACIÓN 4 — Pedidos a proveedor (purchase_orders)
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id     UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  supplier_id   UUID        REFERENCES suppliers(id) ON DELETE SET NULL,
  order_type    TEXT        NOT NULL DEFAULT 'proveedor' CHECK (order_type IN ('proveedor', 'sucursal', 'deposito')),
  items         JSONB       NOT NULL DEFAULT '[]',
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  status        TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
  notes         TEXT        DEFAULT '',
  expected_date DATE        DEFAULT NULL,
  created_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  received_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at   TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company  ON purchase_orders (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch   ON purchase_orders (branch_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders (supplier_id);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='purchase_orders' AND policyname='service_role_purchase_orders') THEN
    CREATE POLICY "service_role_purchase_orders" ON purchase_orders FOR ALL TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='purchase_orders' AND policyname='users_select_purchase_orders') THEN
    CREATE POLICY "users_select_purchase_orders" ON purchase_orders FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())); END IF;
END $$;

-- ============================================================
-- MIGRACIÓN 5 — expenses.type (ingreso vs gasto)
-- ============================================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'gasto'
  CHECK (type IN ('gasto', 'ingreso'));
UPDATE expenses SET type = 'gasto' WHERE type IS NULL OR type = '';
CREATE INDEX IF NOT EXISTS idx_expenses_company_type ON expenses (company_id, type, expense_date DESC);

-- ============================================================
-- MIGRACIÓN 6 — Saldo de clientes (client_balance + client_transactions)
-- ============================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_clients_company_balance ON clients (company_id, balance);

CREATE TABLE IF NOT EXISTS client_transactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES clients(id)   ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('deuda', 'pago', 'nota_credito')),
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  description TEXT        DEFAULT '',
  sale_id         UUID REFERENCES sales(id)        ON DELETE SET NULL,
  credit_note_id  UUID REFERENCES credit_notes(id) ON DELETE SET NULL,
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_transactions_client  ON client_transactions (client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_client_transactions_company ON client_transactions (company_id, date DESC);

ALTER TABLE client_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_transactions' AND policyname='service_role_client_transactions') THEN
    CREATE POLICY "service_role_client_transactions" ON client_transactions FOR ALL TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_transactions' AND policyname='users_select_client_transactions') THEN
    CREATE POLICY "users_select_client_transactions" ON client_transactions FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())); END IF;
END $$;

-- ============================================================
-- MIGRACIÓN 7 — credit_notes.type (credito vs debito)
-- ============================================================

ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'credito'
  CHECK (type IN ('credito', 'debito'));
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS number TEXT DEFAULT NULL;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS notes  TEXT DEFAULT '';
UPDATE credit_notes SET type = 'credito' WHERE type IS NULL OR type = '';
CREATE INDEX IF NOT EXISTS idx_credit_notes_company_type ON credit_notes (company_id, type, created_at DESC);

-- ============================================================
-- MIGRACIÓN 8 — Remitos de venta
-- ============================================================

CREATE TABLE IF NOT EXISTS remitos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id     UUID        REFERENCES branches(id) ON DELETE SET NULL,
  sale_id       UUID        REFERENCES sales(id)    ON DELETE SET NULL,
  number        TEXT        DEFAULT NULL,
  client_name   TEXT        DEFAULT '',
  client_address TEXT       DEFAULT '',
  items         JSONB       NOT NULL DEFAULT '[]',
  notes         TEXT        DEFAULT '',
  delivered_at  DATE        DEFAULT NULL,
  signed_by     TEXT        DEFAULT '',
  created_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remitos_company ON remitos (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remitos_sale    ON remitos (sale_id);

ALTER TABLE remitos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='remitos' AND policyname='service_role_remitos') THEN
    CREATE POLICY "service_role_remitos" ON remitos FOR ALL TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='remitos' AND policyname='users_select_remitos') THEN
    CREATE POLICY "users_select_remitos" ON remitos FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())); END IF;
END $$;

-- ============================================================
-- MIGRACIÓN 9 — Historial de exportaciones CSV
-- ============================================================

CREATE TABLE IF NOT EXISTS export_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT        NOT NULL,
  filters     JSONB       DEFAULT '{}',
  row_count   INTEGER     DEFAULT 0,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_logs_company ON export_logs (company_id, exported_at DESC);

ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='export_logs' AND policyname='service_role_export_logs') THEN
    CREATE POLICY "service_role_export_logs" ON export_logs FOR ALL TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='export_logs' AND policyname='dueno_select_export_logs') THEN
    CREATE POLICY "dueno_select_export_logs" ON export_logs FOR SELECT TO authenticated
      USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())
             AND (SELECT role FROM users WHERE id = auth.uid()) = 'dueno'); END IF;
END $$;

-- ============================================================
-- MIGRACIÓN 10 — Comprobantes fiscales + config
-- ============================================================

CREATE TABLE IF NOT EXISTS fiscal_receipts (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id            UUID        REFERENCES branches(id) ON DELETE SET NULL,
  sale_id              UUID        REFERENCES sales(id)    ON DELETE SET NULL,
  receipt_type         TEXT        NOT NULL,
  point_of_sale        INTEGER     NOT NULL DEFAULT 1,
  number               INTEGER     NOT NULL,
  client_id            UUID        REFERENCES clients(id) ON DELETE SET NULL,
  client_name          TEXT        DEFAULT '',
  client_cuit          TEXT        DEFAULT '',
  client_iva_condition TEXT        DEFAULT 'consumidor_final',
  net_amount           NUMERIC(12,2) DEFAULT 0,
  iva_amount           NUMERIC(12,2) DEFAULT 0,
  total_amount         NUMERIC(12,2) NOT NULL,
  cae                  TEXT        DEFAULT NULL,
  cae_expiry           DATE        DEFAULT NULL,
  status               TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'rejected')),
  afip_error           TEXT        DEFAULT NULL,
  created_by           UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, receipt_type, point_of_sale, number)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_receipts_company ON fiscal_receipts (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_receipts_sale    ON fiscal_receipts (sale_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_receipts_status  ON fiscal_receipts (company_id, status);

CREATE TABLE IF NOT EXISTS fiscal_config (
  company_id        UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  cuit              TEXT DEFAULT '',
  point_of_sale     INTEGER DEFAULT 1,
  integration_type  TEXT DEFAULT NULL,
  api_key           TEXT DEFAULT NULL,
  api_endpoint      TEXT DEFAULT NULL,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fiscal_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_config   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fiscal_receipts' AND policyname='service_role_fiscal_receipts') THEN
    CREATE POLICY "service_role_fiscal_receipts" ON fiscal_receipts FOR ALL TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fiscal_receipts' AND policyname='users_select_fiscal_receipts') THEN
    CREATE POLICY "users_select_fiscal_receipts" ON fiscal_receipts FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fiscal_config' AND policyname='service_role_fiscal_config') THEN
    CREATE POLICY "service_role_fiscal_config" ON fiscal_config FOR ALL TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fiscal_config' AND policyname='dueno_fiscal_config') THEN
    CREATE POLICY "dueno_fiscal_config" ON fiscal_config FOR ALL TO authenticated
      USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())
             AND (SELECT role FROM users WHERE id = auth.uid()) = 'dueno'); END IF;
END $$;

-- ============================================================
-- MIGRACIÓN 11 — Retenciones y percepciones
-- ============================================================

CREATE TABLE IF NOT EXISTS tax_withholdings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id         UUID        REFERENCES branches(id)          ON DELETE SET NULL,
  sale_id           UUID        REFERENCES sales(id)             ON DELETE SET NULL,
  fiscal_receipt_id UUID        REFERENCES fiscal_receipts(id)   ON DELETE SET NULL,
  type              TEXT        NOT NULL CHECK (type IN ('retencion', 'percepcion')),
  agency            TEXT        NOT NULL,
  base_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  rate              NUMERIC(6,4)  NOT NULL DEFAULT 0,
  amount            NUMERIC(12,2) NOT NULL,
  certificate_number TEXT       DEFAULT NULL,
  notes             TEXT        DEFAULT '',
  created_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_withholdings_company ON tax_withholdings (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tax_withholdings_sale    ON tax_withholdings (sale_id);

ALTER TABLE tax_withholdings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tax_withholdings' AND policyname='service_role_tax_withholdings') THEN
    CREATE POLICY "service_role_tax_withholdings" ON tax_withholdings FOR ALL TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tax_withholdings' AND policyname='users_select_tax_withholdings') THEN
    CREATE POLICY "users_select_tax_withholdings" ON tax_withholdings FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())); END IF;
END $$;

-- ============================================================
-- FIN — Verificación rápida
-- ============================================================
SELECT 'cash_sessions'       AS tabla, COUNT(*) FROM cash_sessions       UNION ALL
SELECT 'cash_movements',               COUNT(*) FROM cash_movements       UNION ALL
SELECT 'suppliers',                    COUNT(*) FROM suppliers             UNION ALL
SELECT 'supplier_transactions',        COUNT(*) FROM supplier_transactions UNION ALL
SELECT 'stock_transfers',              COUNT(*) FROM stock_transfers       UNION ALL
SELECT 'purchase_orders',              COUNT(*) FROM purchase_orders       UNION ALL
SELECT 'client_transactions',          COUNT(*) FROM client_transactions   UNION ALL
SELECT 'remitos',                      COUNT(*) FROM remitos               UNION ALL
SELECT 'export_logs',                  COUNT(*) FROM export_logs           UNION ALL
SELECT 'fiscal_receipts',              COUNT(*) FROM fiscal_receipts       UNION ALL
SELECT 'fiscal_config',                COUNT(*) FROM fiscal_config         UNION ALL
SELECT 'tax_withholdings',             COUNT(*) FROM tax_withholdings;
