-- Migration: add created_by column to tables_queue and sales
-- This tracks WHO opened the ticket, separate from the seller assigned to the sale.
-- Run this in the Supabase SQL editor.

-- 1. Add created_by to tables_queue (the person who opened the ticket)
ALTER TABLE tables_queue
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. Add created_by to sales (copied over from tables_queue on complete)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 3. Optional: index for quick look-ups
CREATE INDEX IF NOT EXISTS idx_tables_queue_created_by ON tables_queue(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_created_by        ON sales(created_by);
