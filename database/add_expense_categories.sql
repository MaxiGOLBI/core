-- ============================================================
-- Expense categories (dynamic, managed per company)
-- Run this in the Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT 'slate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, name)
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can read expense categories"
  ON expense_categories FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Dueno can manage expense categories"
  ON expense_categories FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'dueno'
  );
