-- Migration: add CAE (AFIP) columns to the sales table
-- Run this in the Supabase SQL editor before using the electronic invoice feature.

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS cae     TEXT,
  ADD COLUMN IF NOT EXISTS cae_vto DATE;

COMMENT ON COLUMN sales.cae     IS 'CAE code returned by AFIP WSFEv1';
COMMENT ON COLUMN sales.cae_vto IS 'CAE expiration date returned by AFIP WSFEv1';
