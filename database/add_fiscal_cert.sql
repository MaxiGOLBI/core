-- Add certificate storage and environment config to fiscal_config
-- Run ONCE in Supabase SQL editor

ALTER TABLE fiscal_config ADD COLUMN IF NOT EXISTS cert_pem           TEXT    DEFAULT NULL;
ALTER TABLE fiscal_config ADD COLUMN IF NOT EXISTS key_pem            TEXT    DEFAULT NULL;
ALTER TABLE fiscal_config ADD COLUMN IF NOT EXISTS afip_environment   TEXT    NOT NULL DEFAULT 'homologacion'
  CHECK (afip_environment IN ('homologacion', 'produccion'));

-- Insert policy so authenticated dueño can also INSERT (in case row doesn't exist yet)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fiscal_config' AND policyname='users_insert_fiscal_config') THEN
    CREATE POLICY "users_insert_fiscal_config" ON fiscal_config FOR INSERT TO authenticated
      WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;
