-- Enhance expenses table with supplier, due_date, payment info, status, etc.
-- Run ONCE in Supabase SQL editor.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier       TEXT    DEFAULT '';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date       DATE    DEFAULT NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT    DEFAULT 'efectivo';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_date   DATE    DEFAULT NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS voucher_type   TEXT    DEFAULT NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS voucher_number TEXT    DEFAULT NULL;
-- 'paid' | 'pending'
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status         TEXT    DEFAULT 'paid';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS comment        TEXT    DEFAULT '';

-- Back-fill existing rows
UPDATE expenses SET status = 'paid' WHERE status IS NULL;
UPDATE expenses SET comment = description WHERE comment = '' OR comment IS NULL;
