-- ============================================================
-- Servicio Técnico: tabla service_orders
-- Run this in the Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS service_orders (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id          UUID        NOT NULL,
  branch_id           UUID        REFERENCES branches(id) ON DELETE SET NULL,
  table_queue_id      UUID        REFERENCES tables_queue(id) ON DELETE SET NULL,

  -- Datos del cliente
  client_name         TEXT        NOT NULL,
  client_phone        TEXT,

  -- Datos del servicio
  device_description  TEXT        NOT NULL,   -- "iPhone 14 Pro - vidrio roto"
  service_description TEXT,                   -- "Cambio de pantalla"
  notes               TEXT,

  -- Precios y seña
  total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  deposit_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,  -- seña

  -- Estado: pending → in_progress → ready → completed / cancelled
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'in_progress', 'ready', 'completed', 'cancelled')),

  -- Asignaciones
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to         UUID REFERENCES users(id) ON DELETE SET NULL,

  arrival_date        DATE        DEFAULT CURRENT_DATE,  -- fecha en que llegó el equipo
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_service_orders_company   ON service_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_branch    ON service_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status    ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_created   ON service_orders(created_at DESC);

-- RLS
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can access service orders"
  ON service_orders FOR ALL
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
