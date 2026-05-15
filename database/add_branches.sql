-- Multi-branch (sucursales) migration [SFT, CA]
-- Run in Supabase SQL editor ONCE, AFTER add_multi_company.sql

-- ============================================================
-- 1. Create branches table
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Add branch_id to all branch-scoped tables
--    (products/stock, sales, tables_queue, users)
--    clients, discounts, commissions remain company-wide
-- ============================================================
ALTER TABLE users        ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE products     ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE sales        ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE tables_queue ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- ============================================================
-- 3. Update the sales fill trigger to also set branch_id
--    (complete_sale RPC creates the sale; trigger auto-fills both)
-- ============================================================
CREATE OR REPLACE FUNCTION fill_sale_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.company_id IS NULL OR NEW.branch_id IS NULL) AND NEW.cashier_id IS NOT NULL THEN
    SELECT company_id, branch_id
      INTO NEW.company_id, NEW.branch_id
      FROM users
     WHERE id = NEW.cashier_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. Migrate existing data — one default branch per company
-- ============================================================
DO $$
DECLARE
  rec               RECORD;
  default_branch_id UUID;
BEGIN
  FOR rec IN SELECT id FROM companies LOOP
    -- Only create a default branch if company has users/data without branch_id
    IF EXISTS (
      SELECT 1 FROM users
       WHERE company_id = rec.id AND branch_id IS NULL AND role != 'dueno'
      LIMIT 1
    ) THEN
      INSERT INTO branches (company_id, name)
        VALUES (rec.id, 'Sucursal Principal')
        RETURNING id INTO default_branch_id;

      UPDATE users        SET branch_id = default_branch_id WHERE company_id = rec.id AND branch_id IS NULL AND role != 'dueno';
      UPDATE products     SET branch_id = default_branch_id WHERE company_id = rec.id AND branch_id IS NULL;
      UPDATE sales        SET branch_id = default_branch_id WHERE company_id = rec.id AND branch_id IS NULL;
      UPDATE tables_queue SET branch_id = default_branch_id WHERE company_id = rec.id AND branch_id IS NULL;
    END IF;
  END LOOP;
END $$;
