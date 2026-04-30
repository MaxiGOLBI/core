-- Diagnóstico y corrección de sucursales sin company_id
-- Ejecutar en Supabase SQL Editor

-- 1. Ver qué empresas existen
SELECT id, name FROM companies;

-- 2. Ver sucursales y si tienen company_id
SELECT id, name, company_id FROM branches;

-- 3. Ver el company_id del dueño (reemplazá el email)
SELECT id, name, role, company_id, branch_id
FROM users
WHERE role = 'dueno';

-- ─────────────────────────────────────────────────────────────
-- Si el paso 2 muestra sucursales con company_id = NULL,
-- ejecutá esto reemplazando <COMPANY_ID> con el id del paso 1:
-- ─────────────────────────────────────────────────────────────
-- UPDATE branches
-- SET company_id = '<COMPANY_ID>'
-- WHERE company_id IS NULL;

-- ─────────────────────────────────────────────────────────────
-- Si el paso 2 está vacío (no hay sucursales), creá una:
-- ─────────────────────────────────────────────────────────────
-- INSERT INTO branches (name, company_id)
-- VALUES ('Sucursal Principal', '<COMPANY_ID>');
