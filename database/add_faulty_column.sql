-- Migration: add faulty_stock column to products table
-- Run this in the Supabase SQL editor before using the stock faulty tabs feature.
-- faulty_stock tracks the number of units moved to "con fallas".
-- Deducted from the main stock column when units are marked as faulty.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS faulty_stock INTEGER NOT NULL DEFAULT 0;
