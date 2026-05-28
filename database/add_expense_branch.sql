-- Add branch_id to expenses table for per-branch expense tracking
-- Run ONCE in Supabase SQL editor.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses(branch_id);
