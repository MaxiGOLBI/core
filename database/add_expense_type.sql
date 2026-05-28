-- Add type column to expenses to support 'ingreso' alongside 'gasto'
-- Run ONCE in Supabase SQL editor

-- 'gasto'   = outflow (existing behavior, default)
-- 'ingreso' = inflow (other income: cobros, subsidios, devoluciones, etc.)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'gasto'
  CHECK (type IN ('gasto', 'ingreso'));

-- Back-fill all existing rows as 'gasto'
UPDATE expenses SET type = 'gasto' WHERE type IS NULL OR type = '';

-- Index for fast filtering by type
CREATE INDEX IF NOT EXISTS idx_expenses_company_type
  ON expenses (company_id, type, expense_date DESC);
