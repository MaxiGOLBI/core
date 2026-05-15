-- Fix: add INSERT / UPDATE / DELETE policies for authenticated users
-- on all tables created in ALL_MIGRATIONS.sql.
-- These are missing — SELECT existed but writes were blocked.
-- Run ONCE in Supabase SQL editor.

-- Helper: company_id of the calling user
-- Uses the same pattern as the existing tables in this project.

-- ============================================================
-- cash_sessions
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cash_sessions' AND policyname='users_insert_cash_sessions') THEN
    CREATE POLICY "users_insert_cash_sessions" ON cash_sessions FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cash_sessions' AND policyname='users_update_cash_sessions') THEN
    CREATE POLICY "users_update_cash_sessions" ON cash_sessions FOR UPDATE TO authenticated
      USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cash_sessions' AND policyname='users_delete_cash_sessions') THEN
    CREATE POLICY "users_delete_cash_sessions" ON cash_sessions FOR DELETE TO authenticated
      USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- cash_movements
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cash_movements' AND policyname='users_insert_cash_movements') THEN
    CREATE POLICY "users_insert_cash_movements" ON cash_movements FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cash_movements' AND policyname='users_update_cash_movements') THEN
    CREATE POLICY "users_update_cash_movements" ON cash_movements FOR UPDATE TO authenticated
      USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cash_movements' AND policyname='users_delete_cash_movements') THEN
    CREATE POLICY "users_delete_cash_movements" ON cash_movements FOR DELETE TO authenticated
      USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- suppliers
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='suppliers' AND policyname='users_insert_suppliers') THEN
    CREATE POLICY "users_insert_suppliers" ON suppliers FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='suppliers' AND policyname='users_update_suppliers') THEN
    CREATE POLICY "users_update_suppliers" ON suppliers FOR UPDATE TO authenticated
      USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='suppliers' AND policyname='users_delete_suppliers') THEN
    CREATE POLICY "users_delete_suppliers" ON suppliers FOR DELETE TO authenticated
      USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- supplier_transactions
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='supplier_transactions' AND policyname='users_insert_supplier_transactions') THEN
    CREATE POLICY "users_insert_supplier_transactions" ON supplier_transactions FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='supplier_transactions' AND policyname='users_update_supplier_transactions') THEN
    CREATE POLICY "users_update_supplier_transactions" ON supplier_transactions FOR UPDATE TO authenticated
      USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='supplier_transactions' AND policyname='users_delete_supplier_transactions') THEN
    CREATE POLICY "users_delete_supplier_transactions" ON supplier_transactions FOR DELETE TO authenticated
      USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- stock_transfers
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stock_transfers' AND policyname='users_insert_stock_transfers') THEN
    CREATE POLICY "users_insert_stock_transfers" ON stock_transfers FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stock_transfers' AND policyname='users_update_stock_transfers') THEN
    CREATE POLICY "users_update_stock_transfers" ON stock_transfers FOR UPDATE TO authenticated
      USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stock_transfers' AND policyname='users_delete_stock_transfers') THEN
    CREATE POLICY "users_delete_stock_transfers" ON stock_transfers FOR DELETE TO authenticated
      USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- purchase_orders
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='purchase_orders' AND policyname='users_insert_purchase_orders') THEN
    CREATE POLICY "users_insert_purchase_orders" ON purchase_orders FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='purchase_orders' AND policyname='users_update_purchase_orders') THEN
    CREATE POLICY "users_update_purchase_orders" ON purchase_orders FOR UPDATE TO authenticated
      USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='purchase_orders' AND policyname='users_delete_purchase_orders') THEN
    CREATE POLICY "users_delete_purchase_orders" ON purchase_orders FOR DELETE TO authenticated
      USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- client_transactions
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_transactions' AND policyname='users_insert_client_transactions') THEN
    CREATE POLICY "users_insert_client_transactions" ON client_transactions FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_transactions' AND policyname='users_update_client_transactions') THEN
    CREATE POLICY "users_update_client_transactions" ON client_transactions FOR UPDATE TO authenticated
      USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_transactions' AND policyname='users_delete_client_transactions') THEN
    CREATE POLICY "users_delete_client_transactions" ON client_transactions FOR DELETE TO authenticated
      USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- remitos
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='remitos' AND policyname='users_insert_remitos') THEN
    CREATE POLICY "users_insert_remitos" ON remitos FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='remitos' AND policyname='users_update_remitos') THEN
    CREATE POLICY "users_update_remitos" ON remitos FOR UPDATE TO authenticated
      USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='remitos' AND policyname='users_delete_remitos') THEN
    CREATE POLICY "users_delete_remitos" ON remitos FOR DELETE TO authenticated
      USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- export_logs
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='export_logs' AND policyname='users_insert_export_logs') THEN
    CREATE POLICY "users_insert_export_logs" ON export_logs FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- fiscal_receipts
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fiscal_receipts' AND policyname='users_insert_fiscal_receipts') THEN
    CREATE POLICY "users_insert_fiscal_receipts" ON fiscal_receipts FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fiscal_receipts' AND policyname='users_update_fiscal_receipts') THEN
    CREATE POLICY "users_update_fiscal_receipts" ON fiscal_receipts FOR UPDATE TO authenticated
      USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fiscal_receipts' AND policyname='users_delete_fiscal_receipts') THEN
    CREATE POLICY "users_delete_fiscal_receipts" ON fiscal_receipts FOR DELETE TO authenticated
      USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- fiscal_config
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fiscal_config' AND policyname='users_insert_fiscal_config') THEN
    CREATE POLICY "users_insert_fiscal_config" ON fiscal_config FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fiscal_config' AND policyname='users_update_fiscal_config') THEN
    CREATE POLICY "users_update_fiscal_config" ON fiscal_config FOR UPDATE TO authenticated
      USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- tax_withholdings
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tax_withholdings' AND policyname='users_insert_tax_withholdings') THEN
    CREATE POLICY "users_insert_tax_withholdings" ON tax_withholdings FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tax_withholdings' AND policyname='users_update_tax_withholdings') THEN
    CREATE POLICY "users_update_tax_withholdings" ON tax_withholdings FOR UPDATE TO authenticated
      USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tax_withholdings' AND policyname='users_delete_tax_withholdings') THEN
    CREATE POLICY "users_delete_tax_withholdings" ON tax_withholdings FOR DELETE TO authenticated
      USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- Verificación: mostrar todas las políticas de las tablas nuevas
-- ============================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN (
  'cash_sessions','cash_movements','suppliers','supplier_transactions',
  'stock_transfers','purchase_orders','client_transactions','remitos',
  'export_logs','fiscal_receipts','fiscal_config','tax_withholdings'
)
ORDER BY tablename, cmd;
