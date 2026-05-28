-- Extend credit_notes to support both credit and debit notes
-- Run ONCE in Supabase SQL editor

-- 'credito' = reduces client debt (default, existing behavior)
-- 'debito'  = increases client debt (price adjustment, extra charge)
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'credito'
  CHECK (type IN ('credito', 'debito'));

ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS number TEXT DEFAULT NULL;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS notes  TEXT DEFAULT '';

-- Back-fill existing rows
UPDATE credit_notes SET type = 'credito' WHERE type IS NULL OR type = '';

CREATE INDEX IF NOT EXISTS idx_credit_notes_company_type
  ON credit_notes (company_id, type, created_at DESC);
