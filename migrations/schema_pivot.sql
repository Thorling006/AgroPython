-- Migración AgroSmart: Estructura Global y Jerárquica

-- 1. Tabla de Países
CREATE TABLE IF NOT EXISTS countries (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE, -- ej: SV, GT, MX
    license_status TEXT DEFAULT 'active' CHECK (license_status IN ('active', 'inactive', 'trial')),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Organizaciones (Empresas/Cooperativas)
CREATE TABLE IF NOT EXISTS organizations (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    country_id BIGINT REFERENCES countries(id),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'private' CHECK (type IN ('government', 'private', 'cooperative')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Modificaciones a Usuarios
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_id BIGINT REFERENCES countries(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'farmer' CHECK (role IN ('global_owner', 'ministry_admin', 'org_admin', 'farmer'));

-- 4. Modificaciones a Cultivos
ALTER TABLE crops ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
-- Si org_id está presente, el cultivo pertenece a la empresa, no solo al usuario.

-- 5. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country_id);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_crops_org ON crops(org_id);

-- 6. Insertar país base (ejemplo)
INSERT INTO countries (name, code) VALUES ('Global', 'GL') ON CONFLICT DO NOTHING;
INSERT INTO countries (name, code) VALUES ('El Salvador', 'SV') ON CONFLICT DO NOTHING;
