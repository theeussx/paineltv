-- Schema do central. Roda uma vez via `npm run migrate`.
-- Tudo com UUID como chave, igual já era nos JSON files, pra facilitar a
-- migração de quem já tinha dados no formato antigo.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'user')),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Blindagem: só 'owner' pode ter location_id nulo; admin/user sempre
  -- pertencem a um local.
  CONSTRAINT owner_has_no_location CHECK (
    (role = 'owner' AND location_id IS NULL) OR
    (role <> 'owner' AND location_id IS NOT NULL)
  )
);

-- Fonte de verdade das TVs agora é o central (Postgres), não mais um
-- JSON local no agente. O agente vira um executor sem estado: recebe a
-- descrição completa (brand/ip/mac/pairing_data) junto com cada comando.
CREATE TABLE IF NOT EXISTS tvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  ip TEXT NOT NULL,
  mac TEXT,
  -- Dados de pareamento específicos da marca (token Samsung, client-key
  -- LG, cert Android TV, auth token Vizio...). Cada driver decide o que
  -- guardar aqui; pro resto do sistema é só um blob opaco.
  pairing_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tvs_location ON tvs(location_id);

-- Auditoria: uma linha por comando que passou pelo proxy do central.
-- Guardamos mesmo quando falha (ok=false), porque "tentou e falhou" é
-- exatamente o tipo de coisa que auditoria existe pra registrar.
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  tv_id UUID,
  tv_name TEXT,
  ok BOOLEAN NOT NULL,
  error_message TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_location_created ON audit_logs(location_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
