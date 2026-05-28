-- Client balance tracking (cuenta corriente)
-- Run ONCE in Supabase SQL editor

-- ============================================================
-- 1. Add balance column to clients
-- ============================================================
-- Positive balance = client owes us money
-- Negative balance = we owe the client (e.g. unused credit note)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_clients_company_balance
  ON clients (company_id, balance);

-- ============================================================
-- 2. client_transactions — full ledger history
-- ============================================================
CREATE TABLE IF NOT EXISTS client_transactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES clients(id)   ON DELETE CASCADE,

  -- 'deuda':        client owes us (increases balance)
  -- 'pago':         client paid us (decreases balance)
  -- 'nota_credito': credit note applied (decreases balance)
  type        TEXT        NOT NULL
              CHECK (type IN ('deuda', 'pago', 'nota_credito')),

  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  description TEXT        DEFAULT '',

  -- Optional links to source records
  sale_id          UUID REFERENCES sales(id)        ON DELETE SET NULL,
  credit_note_id   UUID REFERENCES credit_notes(id) ON DELETE SET NULL,

  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_transactions_client
  ON client_transactions (client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_client_transactions_company
  ON client_transactions (company_id, date DESC);

ALTER TABLE client_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_client_transactions"
  ON client_transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "users_select_client_transactions"
  ON client_transactions FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
