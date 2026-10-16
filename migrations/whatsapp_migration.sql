-- ==============================================================================
-- MIGRACIÓN SUPABASE: WhatsApp-First Communication & Activity Reminders System
-- ==============================================================================

-- 1. Asegurar columnas de WhatsApp en la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_country_code TEXT DEFAULT '+503';
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT false;

-- 2. Tabla unificada de actividades y recordatorios de cultivo
CREATE TABLE IF NOT EXISTS crop_activities (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    crop_id BIGINT REFERENCES crops(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'abonado', 'fertilización', 'riego', 'poda', 'fumigación', 'cosecha'
    )),
    description TEXT,
    scheduled_date DATE NOT NULL,
    status TEXT DEFAULT 'pendiente' CHECK (status IN (
        'pendiente', 'realizado', 'reprogramado', 'omitido'
    )),
    completed_at TIMESTAMPTZ,
    rescheduled_to DATE,
    response_received TEXT, -- 'realizado', 'recordar_tarde', 'reprogramar'
    whatsapp_reminder_sent BOOLEAN DEFAULT false,
    whatsapp_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de logs de WhatsApp para auditoría y debugging de n8n
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    phone_number TEXT NOT NULL,
    message_type TEXT NOT NULL, -- 'reminder', 'interactive_response', 'confirmation'
    template_name TEXT,
    payload JSONB,
    status TEXT DEFAULT 'sent',
    error_message TEXT,
    wa_message_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices optimizados para las consultas diarias de n8n y del Dashboard
CREATE INDEX IF NOT EXISTS idx_crop_activities_scheduled ON crop_activities(scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_crop_activities_user ON crop_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_crop_activities_crop ON crop_activities(crop_id);
CREATE INDEX IF NOT EXISTS idx_crop_activities_status ON crop_activities(status);

-- 5. Trigger de actualización automática para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_update_crop_activities_updated_at ON crop_activities;
CREATE TRIGGER trg_update_crop_activities_updated_at
    BEFORE UPDATE ON crop_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE crop_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read crop_activities" ON crop_activities FOR SELECT USING (true);
CREATE POLICY "Public insert crop_activities" ON crop_activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update crop_activities" ON crop_activities FOR UPDATE USING (true);
CREATE POLICY "Public delete crop_activities" ON crop_activities FOR DELETE USING (true);

CREATE POLICY "Public read whatsapp_logs" ON whatsapp_logs FOR SELECT USING (true);
CREATE POLICY "Public insert whatsapp_logs" ON whatsapp_logs FOR INSERT WITH CHECK (true);
