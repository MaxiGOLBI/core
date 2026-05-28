-- Purchase orders (pedidos a proveedor / sucursal / depósito)
-- Run ONCE in Supabase SQL editor AFTER add_suppliers.sql

CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id     UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,

  -- Who we're ordering from
  supplier_id   UUID        REFERENCES suppliers(id) ON DELETE SET NULL,
  order_type    TEXT        NOT NULL DEFAULT 'proveedor'
                            CHECK (order_type IN ('proveedor', 'sucursal', 'deposito')),

  -- Items: [{product_id, product_name, code, qty, unit_cost, subtotal}]
  items         JSONB       NOT NULL DEFAULT '[]',
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- draft → sent → received | cancelled
  status        TEXT        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),

  notes         TEXT        DEFAULT '',
  expected_date DATE        DEFAULT NULL,

  created_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  received_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at   TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company
  ON purchase_orders (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch
  ON purchase_orders (branch_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier
  ON purchase_orders (supplier_id);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_purchase_orders"
  ON purchase_orders FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "users_select_purchase_orders"
  ON purchase_orders FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
