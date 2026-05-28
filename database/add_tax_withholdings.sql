-- Tax withholdings and perceptions (retenciones/percepciones)
-- Run ONCE in Supabase SQL editor AFTER add_fiscal_receipts.sql

CREATE TABLE IF NOT EXISTS tax_withholdings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id       UUID        REFERENCES branches(id)          ON DELETE SET NULL,

  -- Link to the originating sale or fiscal receipt
  sale_id         UUID        REFERENCES sales(id)             ON DELETE SET NULL,
  fiscal_receipt_id UUID      REFERENCES fiscal_receipts(id)   ON DELETE SET NULL,

  -- 'retencion' = we withhold from payment to supplier
  -- 'percepcion' = we collect on behalf of agency from client
  type            TEXT        NOT NULL CHECK (type IN ('retencion', 'percepcion')),

  -- Tax agency: 'AFIP' | 'IIBB_BUENOS_AIRES' | 'IIBB_CABA' | etc.
  agency          TEXT        NOT NULL,

  -- Tax base and rates
  base_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  rate            NUMERIC(6,4)  NOT NULL DEFAULT 0,  -- e.g. 0.035 = 3.5%
  amount          NUMERIC(12,2) NOT NULL,             -- base_amount * rate

  -- Certificate number (issued by the agency)
  certificate_number TEXT      DEFAULT NULL,

  notes           TEXT        DEFAULT '',
  created_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_withholdings_company
  ON tax_withholdings (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tax_withholdings_sale
  ON tax_withholdings (sale_id);

ALTER TABLE tax_withholdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_tax_withholdings"
  ON tax_withholdings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "users_select_tax_withholdings"
  ON tax_withholdings FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
