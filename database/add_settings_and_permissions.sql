-- ============================================================
-- Company settings + role-based view permissions
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Company settings (commission period, etc.)
CREATE TABLE IF NOT EXISTS company_settings (
  company_id         UUID PRIMARY KEY,
  commission_period  TEXT DEFAULT 'weekly'
                     CHECK (commission_period IN ('daily', 'weekly', 'monthly')),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can access settings"
  ON company_settings FOR ALL
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- 2. Role-based view permissions (owner configures which pages each role can see)
CREATE TABLE IF NOT EXISTS role_permissions (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    UUID    NOT NULL,
  role          TEXT    NOT NULL,
  allowed_views TEXT[]  NOT NULL DEFAULT '{}',
  UNIQUE (company_id, role)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can read role permissions"
  ON role_permissions FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Dueño can manage role permissions"
  ON role_permissions FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'dueno'
  );
