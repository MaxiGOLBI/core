-- Agrega columna close_breakdown a cash_sessions para guardar
-- el desglose de cierre por medio de pago (manual o automático).
-- Ejecutar UNA SOLA VEZ en el editor SQL de Supabase.

ALTER TABLE cash_sessions
  ADD COLUMN IF NOT EXISTS close_breakdown JSONB DEFAULT NULL;
