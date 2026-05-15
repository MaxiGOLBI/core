-- Stock transfers between branches
-- Run ONCE in Supabase SQL editor AFTER add_branches.sql

CREATE TABLE IF NOT EXISTS stock_transfers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_branch_id  UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  to_branch_id    UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty             INTEGER     NOT NULL CHECK (qty > 0),

  -- pending → approved (stock moved) | rejected
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),

  notes           TEXT        DEFAULT '',
  requested_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  resolved_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_company
  ON stock_transfers (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status
  ON stock_transfers (company_id, status);

ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_stock_transfers"
  ON stock_transfers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "users_select_stock_transfers"
  ON stock_transfers FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
