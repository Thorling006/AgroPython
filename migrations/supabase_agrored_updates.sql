-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase.

-- 1. Actualizar la tabla de usuarios para soportar perfiles y notificaciones
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS whatsapp text;

-- 2. Crear tabla de publicaciones (Muro)
CREATE TABLE IF NOT EXISTS public.posts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  likes_count integer DEFAULT 0,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 3. Crear tabla de amistades
CREATE TABLE IF NOT EXISTS public.friendships (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id1 bigint NOT NULL,
  user_id2 bigint NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT friendships_pkey PRIMARY KEY (id),
  CONSTRAINT friendships_user_id1_fkey FOREIGN KEY (user_id1) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT friendships_user_id2_fkey FOREIGN KEY (user_id2) REFERENCES public.users(id) ON DELETE CASCADE,
  -- Evitar duplicados (1-2 o 2-1)
  CONSTRAINT unique_friendship UNIQUE (user_id1, user_id2)
);

-- Habilitar RLS (Opcional, si lo estás usando)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas básicas (ajustar según tu seguridad real)
CREATE POLICY "Permitir todo en posts" ON public.posts FOR ALL USING (true);
CREATE POLICY "Permitir todo en amistades" ON public.friendships FOR ALL USING (true);

-- 4. Crear tabla de comentarios
CREATE TABLE IF NOT EXISTS public.post_comments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  post_id bigint NOT NULL,
  user_id bigint NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_comments_pkey PRIMARY KEY (id),
  CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
  CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo en comentarios" ON public.post_comments FOR ALL USING (true);
