-- Migration: add free-text client_name and dni to credit_notes
-- Run once in Supabase SQL editor.

ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS dni         TEXT;
