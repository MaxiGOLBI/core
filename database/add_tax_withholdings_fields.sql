-- Extend tax_withholdings with fields required for the Retenciones/Percepciones view
ALTER TABLE tax_withholdings
  ADD COLUMN IF NOT EXISTS sufrida_emitida   TEXT DEFAULT 'sufrida',
  ADD COLUMN IF NOT EXISTS regimen           TEXT,
  ADD COLUMN IF NOT EXISTS proveedor_cliente TEXT,
  ADD COLUMN IF NOT EXISTS cuit              TEXT,
  ADD COLUMN IF NOT EXISTS tipo              TEXT;
