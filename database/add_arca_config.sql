-- Tabla de configuración centralizada de ARCA/AFIP
-- Solo existe una fila (id = 1) para toda la empresa [CMV]
CREATE TABLE IF NOT EXISTS arca_config (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  cuit            TEXT        NOT NULL,
  env             TEXT        NOT NULL DEFAULT 'homologation',
  active          BOOLEAN     NOT NULL DEFAULT FALSE,
  last_tested_at  TIMESTAMPTZ,
  configured_by   UUID        REFERENCES auth.users(id),
  CONSTRAINT single_row CHECK (id = 1)
);
