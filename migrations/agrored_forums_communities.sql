-- Script SQL para crear las tablas de Foros y Comunidades en AgroRed

-- 1. Tabla de Comunidades por Rubro
CREATE TABLE IF NOT EXISTS public.communities (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    icon text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Miembros de las Comunidades
CREATE TABLE IF NOT EXISTS public.community_members (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    community_id bigint NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at timestamp with time zone DEFAULT now(),
    UNIQUE(community_id, user_id)
);

-- 3. Tabla de Foros Destacados
CREATE TABLE IF NOT EXISTS public.forums (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    description text,
    created_by bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Miembros de Foros (Amigos invitados)
CREATE TABLE IF NOT EXISTS public.forum_members (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    forum_id bigint NOT NULL REFERENCES public.forums(id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at timestamp with time zone DEFAULT now(),
    UNIQUE(forum_id, user_id)
);

-- Insertar algunas comunidades por defecto (Solo si la tabla está vacía)
INSERT INTO public.communities (name, icon, description)
SELECT 'Maíz', '🌽', 'Comunidad para productores de Maíz'
WHERE NOT EXISTS (SELECT 1 FROM public.communities WHERE name = 'Maíz');

INSERT INTO public.communities (name, icon, description)
SELECT 'Café', '☕', 'Comunidad para productores de Café'
WHERE NOT EXISTS (SELECT 1 FROM public.communities WHERE name = 'Café');

INSERT INTO public.communities (name, icon, description)
SELECT 'Horticultura', '🍅', 'Comunidad de Horticultura'
WHERE NOT EXISTS (SELECT 1 FROM public.communities WHERE name = 'Horticultura');

INSERT INTO public.communities (name, icon, description)
SELECT 'Frutales', '🍊', 'Comunidad de Frutales'
WHERE NOT EXISTS (SELECT 1 FROM public.communities WHERE name = 'Frutales');

-- Permisos (Políticas permisivas para el entorno de desarrollo)
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo en communities" ON public.communities FOR ALL USING (true);

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo en community_members" ON public.community_members FOR ALL USING (true);

ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo en forums" ON public.forums FOR ALL USING (true);

ALTER TABLE public.forum_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo en forum_members" ON public.forum_members FOR ALL USING (true);
