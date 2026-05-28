-- Agrega columna service_data a tables_queue para guardar datos del servicio técnico pendiente
ALTER TABLE tables_queue ADD COLUMN IF NOT EXISTS service_data JSONB DEFAULT NULL;
