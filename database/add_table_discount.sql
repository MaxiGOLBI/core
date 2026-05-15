-- Agrega columnas de descuento global al ticket (separado de los descuentos por ítem)
ALTER TABLE tables_queue
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type  TEXT    DEFAULT 'fixed';
