-- Expense items table (products included in a stock expense)
-- Add fiscal columns to expenses
-- Run ONCE in Supabase SQL editor.

-- 1. Products linked to a stock expense
CREATE TABLE IF NOT EXISTS expense_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID        NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES products(id),
  qty         INTEGER     NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_cost   NUMERIC(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_items_expense
  ON expense_items (expense_id);

ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_items_company_isolation"
  ON expense_items FOR ALL
  USING (
    expense_id IN (
      SELECT id FROM expenses
      WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- 2. Expense subtype and fiscal fields on expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_subtype TEXT         DEFAULT 'gasto';   -- 'gasto' | 'stock'
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS iva_rate        NUMERIC(5,2) DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS iva_amount      NUMERIC(12,2) DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS other_taxes     NUMERIC(12,2) DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS percepciones    NUMERIC(12,2) DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS retenciones     NUMERIC(12,2) DEFAULT 0;
