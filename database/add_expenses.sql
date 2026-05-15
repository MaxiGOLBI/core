-- Expenses table — gastos de la empresa [owner only]
-- Run in Supabase SQL editor ONCE.

CREATE TABLE IF NOT EXISTS expenses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id),
  category    TEXT        NOT NULL,           -- 'alquiler', 'distribuidores', 'servicios', etc.
  description TEXT        NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  expense_date DATE       NOT NULL DEFAULT CURRENT_DATE,
  created_by  UUID        REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast date-range queries
CREATE INDEX IF NOT EXISTS idx_expenses_company_date
  ON expenses (company_id, expense_date DESC);

-- Row-level security (optional but recommended)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users of the same company to read/write their own expenses.
-- Adjust to your existing RLS pattern if needed.
CREATE POLICY "expenses_company_isolation"
  ON expenses
  USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
