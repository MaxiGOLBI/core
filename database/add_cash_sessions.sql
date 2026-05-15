-- Cash register sessions and movements
-- Run ONCE in Supabase SQL editor AFTER add_branches.sql

-- ============================================================
-- 1. cash_sessions — one open session per branch at a time
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id        UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,

  opening_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_amount   NUMERIC(12,2) DEFAULT NULL,
  expected_amount  NUMERIC(12,2) DEFAULT NULL,  -- calculated on close
  difference       NUMERIC(12,2) DEFAULT NULL,  -- closing - expected

  status           TEXT        NOT NULL DEFAULT 'open'
                               CHECK (status IN ('open', 'closed')),

  notes            TEXT        DEFAULT '',

  opened_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  closed_by        UUID        REFERENCES users(id) ON DELETE SET NULL,

  opened_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_branch_status
  ON cash_sessions (branch_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_company_opened
  ON cash_sessions (company_id, opened_at DESC);

-- ============================================================
-- 2. cash_movements — every entry/exit linked to a session
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_movements (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID        NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id    UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,

  -- type: sale | expense | manual_in | manual_out
  type         TEXT        NOT NULL
               CHECK (type IN ('sale', 'expense', 'manual_in', 'manual_out')),

  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description  TEXT        DEFAULT '',

  -- optional links to source records
  sale_id      UUID        REFERENCES sales(id) ON DELETE SET NULL,
  expense_id   UUID        REFERENCES expenses(id) ON DELETE SET NULL,

  created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_session
  ON cash_movements (session_id, created_at);

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- Service role (backend) has full access
CREATE POLICY "service_role_cash_sessions"
  ON cash_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_cash_movements"
  ON cash_movements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated users can read their company's data
CREATE POLICY "users_select_cash_sessions"
  ON cash_sessions FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "users_select_cash_movements"
  ON cash_movements FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
