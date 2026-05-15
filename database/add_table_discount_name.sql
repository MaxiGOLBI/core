-- Permite rastrear qué descuento de catálogo se aplicó al ticket
ALTER TABLE tables_queue
  ADD COLUMN IF NOT EXISTS discount_id   TEXT,
  ADD COLUMN IF NOT EXISTS discount_name TEXT;

-- Columna de comentario por ítem (por si no existe aún)
ALTER TABLE table_items
  ADD COLUMN IF NOT EXISTS comment TEXT DEFAULT '';
