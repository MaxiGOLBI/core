-- Add optional SKU / custom code field to products
-- Run this in the Supabase SQL editor

ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
