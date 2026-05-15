-- Add role_labels JSONB column to company_settings
-- Allows owners to rename role display labels
-- Run this in the Supabase SQL editor

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS role_labels JSONB DEFAULT '{"vendedor":"Vendedor","cajero":"Cajero","encargado":"Encargado"}'::jsonb;
