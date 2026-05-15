-- Fiscal receipts (comprobantes fiscales) linked to sales
-- Run ONCE in Supabase SQL editor
-- NOTE: CAE is obtained from AFIP/ARCA — integration pending decision (WS propio vs servicio tercero)

-- ============================================================
-- 1. fiscal_receipts
-- ============================================================
CREATE TABLE IF NOT EXISTS fiscal_receipts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id       UUID        REFERENCES branches(id) ON DELETE SET NULL,
  sale_id         UUID        REFERENCES sales(id)   ON DELETE SET NULL,

  -- Comprobante type: 'FA' | 'FB' | 'FC' | 'NCA' | 'NCB' | 'NCC' | 'NDA' | 'NDB'
  receipt_type    TEXT        NOT NULL,

  -- AFIP point of sale (punto de venta) — configured in AFIP portal
  point_of_sale   INTEGER     NOT NULL DEFAULT 1,

  -- Sequential receipt number within point_of_sale
  number          INTEGER     NOT NULL,

  -- Client fiscal data at time of issue
  client_id       UUID        REFERENCES clients(id) ON DELETE SET NULL,
  client_name     TEXT        DEFAULT '',
  client_cuit     TEXT        DEFAULT '',
  -- IVA condition: 'responsable_inscripto' | 'monotributo' | 'consumidor_final' | 'exento'
  client_iva_condition TEXT   DEFAULT 'consumidor_final',

  -- Amounts
  net_amount      NUMERIC(12,2) DEFAULT 0,
  iva_amount      NUMERIC(12,2) DEFAULT 0,
  total_amount    NUMERIC(12,2) NOT NULL,

  -- CAE data (filled after AFIP authorization)
  cae             TEXT        DEFAULT NULL,
  cae_expiry      DATE        DEFAULT NULL,

  -- 'pending' = not yet sent to AFIP | 'authorized' = has CAE | 'rejected' = AFIP rejected
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'authorized', 'rejected')),

  afip_error      TEXT        DEFAULT NULL,  -- AFIP rejection message if any

  created_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure no duplicate receipt numbers per company/point_of_sale/type
  UNIQUE (company_id, receipt_type, point_of_sale, number)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_receipts_company
  ON fiscal_receipts (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_receipts_sale
  ON fiscal_receipts (sale_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_receipts_status
  ON fiscal_receipts (company_id, status);

ALTER TABLE fiscal_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_fiscal_receipts"
  ON fiscal_receipts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "users_select_fiscal_receipts"
  ON fiscal_receipts FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- 2. fiscal_config — per-company AFIP configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS fiscal_config (
  company_id        UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  cuit              TEXT DEFAULT '',
  point_of_sale     INTEGER DEFAULT 1,
  -- 'wsfe_propio' | 'servicio_tercero' — filled once decision is made
  integration_type  TEXT DEFAULT NULL,
  -- For servicio_tercero: API key / token
  api_key           TEXT DEFAULT NULL,
  api_endpoint      TEXT DEFAULT NULL,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fiscal_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_fiscal_config"
  ON fiscal_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "dueno_fiscal_config"
  ON fiscal_config FOR ALL TO authenticated
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'dueno'
  );
