-- Multi-company isolation migration [SFT, CA]
-- Run in Supabase SQL editor ONCE.

-- ============================================================
-- 1. Create companies table
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Add company_id to all tenant-scoped tables
-- ============================================================
ALTER TABLE users        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE products     ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE clients      ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE discounts    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE sales        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE tables_queue ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE commissions  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- ============================================================
-- 3. Trigger: auto-fill sales.company_id from cashier on insert
--    Needed because complete_sale() RPC doesn't pass company_id
-- ============================================================
CREATE OR REPLACE FUNCTION fill_sale_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.cashier_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id FROM users WHERE id = NEW.cashier_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sales_fill_company_id ON sales;
CREATE TRIGGER sales_fill_company_id
  BEFORE INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION fill_sale_company_id();

-- ============================================================
-- 5. Migrate existing data to a default company (if any)
--    This preserves all existing rows so nothing breaks.
-- ============================================================
DO $$
DECLARE
  default_company_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE company_id IS NULL LIMIT 1) THEN
    INSERT INTO companies (name) VALUES ('Empresa Principal')
      RETURNING id INTO default_company_id;

    UPDATE users        SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE products     SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE clients      SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE discounts    SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE sales        SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE tables_queue SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE commissions  SET company_id = default_company_id WHERE company_id IS NULL;
  END IF;
END $$;
