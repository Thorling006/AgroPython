-- ==============================================================================
-- MIGRACIÓN SUPABASE: Tabla de Fichas de Reporte de Videollamadas y Soporte
-- ==============================================================================
-- Descripción: Almacena los registros y tickets de asistencia técnica generados
-- en las videollamadas satelitales entre Agricultores/Cooperativas, Admins de
-- Ministerio y Dueños Globales (AgroSmart Corporation).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS videocall_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    caller_id TEXT NOT NULL,
    caller_name TEXT,
    caller_role TEXT,
    target_role TEXT, -- 'ministry_admin' (Gobierno) o 'global_owner' (AgroSmart Corp)
    country TEXT,
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open', -- Estados: 'open', 'in_progress', 'resolved', 'closed'
    attended_by TEXT,
    attended_by_name TEXT,
    resolution_notes TEXT, -- Qué ocurrió y cómo se gestionó el caso
    satisfaction_rating TEXT, -- Calificación de la gestión ('excelente', 'buena', 'regular', 'no_resuelta')
    room_name TEXT
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE videocall_reports ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad de Lectura y Escritura (Abierto para operación transparente del sistema)
CREATE POLICY "Public read videocall_reports"
    ON videocall_reports
    FOR SELECT
    USING (true);

CREATE POLICY "Public insert videocall_reports"
    ON videocall_reports
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public update videocall_reports"
    ON videocall_reports
    FOR UPDATE
    USING (true);

CREATE POLICY "Public delete videocall_reports"
    ON videocall_reports
    FOR DELETE
    USING (true);

-- Índices recomendados para consultas rápidas por rol o país
CREATE INDEX IF NOT EXISTS idx_videocall_reports_caller ON videocall_reports(caller_id);
CREATE INDEX IF NOT EXISTS idx_videocall_reports_target ON videocall_reports(target_role);
CREATE INDEX IF NOT EXISTS idx_videocall_reports_country ON videocall_reports(country);
CREATE INDEX IF NOT EXISTS idx_videocall_reports_status ON videocall_reports(status);
