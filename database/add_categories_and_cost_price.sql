-- ============================================================
-- Categories table + cost_price column on products
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Categories
CREATE TABLE IF NOT EXISTS categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  company_id  UUID        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage categories"
  ON categories FOR ALL
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- 2. Add category_id to products (nullable — existing products stay unclassified)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- 3. Add cost_price to products (nullable — defaults to 0)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;
