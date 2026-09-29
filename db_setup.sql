-- 1. Usuarios de la aplicación
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT, -- En una app real, usar Supabase Auth
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'ATHLETE',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar que la columna avatar_url exista en bases de datos ya creadas
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
NOTIFY pgrst, 'reload schema';

-- 2. Programación diaria de entrenamientos
CREATE TABLE IF NOT EXISTS daily_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT UNIQUE NOT NULL, -- Formato YYYY-MM-DD
  title TEXT NOT NULL,
  focus TEXT,
  content TEXT, -- JSON stringificado de los bloques
  is_rest_day BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Registros de resultados (Logs)
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  day_id TEXT, -- Referencia a la fecha de daily_workouts
  section_title TEXT, -- Título del bloque (Warm up, Strength, etc)
  result TEXT NOT NULL,
  notes TEXT,
  date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Récords de atletas (PRs, Biometría)
CREATE TABLE IF NOT EXISTS athlete_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  exercise TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Notificaciones
CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  receiver_id UUID REFERENCES app_users(id) ON DELETE CASCADE, -- NULL para global
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- --- MIGRACIONES Y CORRECCIONES ---

-- Asegurar que workout_logs.day_id sea TEXT para fechas
ALTER TABLE workout_logs ALTER COLUMN day_id TYPE TEXT;

-- Añadir columna section_title si no existe
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_logs' AND column_name='section_title') THEN
    ALTER TABLE workout_logs ADD COLUMN section_title TEXT;
  END IF;
END $$;

-- Añadir columna avatar_url si no existe en app_users
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_users' AND column_name='avatar_url') THEN
    ALTER TABLE app_users ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Añadir restricción única para récords de atletas (evita duplicados por ejercicio)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_exercise') THEN
        ALTER TABLE athlete_records ADD CONSTRAINT unique_user_exercise UNIQUE (user_id, exercise);
    END IF;
END $$;

-- ==============================================================================
-- 6. CONFIGURACIÓN Y POLÍTICAS DE SUPABASE STORAGE (BUCKET 'fotosPerfil')
-- ==============================================================================

-- A. Crear o actualizar el bucket 'fotosPerfil' como público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotosPerfil', 
  'fotosPerfil', 
  true, 
  10485760, -- 10MB límite
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/heic', 'image/avif']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/heic', 'image/avif'];

-- B. Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "Permitir lectura publica fotosPerfil" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida fotosPerfil" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualizacion fotosPerfil" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminacion fotosPerfil" ON storage.objects;

-- D. POLÍTICA 1: SELECT (Permitir a todos ver y descargar las fotos de perfil)
CREATE POLICY "Permitir lectura publica fotosPerfil"
ON storage.objects
FOR SELECT
TO public, anon, authenticated
USING (bucket_id = 'fotosPerfil' OR bucket_id = 'FotosPerfil');

-- E. POLÍTICA 2: INSERT (Permitir subir nuevas fotos de perfil)
CREATE POLICY "Permitir subida fotosPerfil"
ON storage.objects
FOR INSERT
TO public, anon, authenticated
WITH CHECK (bucket_id = 'fotosPerfil' OR bucket_id = 'FotosPerfil');

-- F. POLÍTICA 3: UPDATE (Permitir actualizar/sobrescribir fotos existentes)
CREATE POLICY "Permitir actualizacion fotosPerfil"
ON storage.objects
FOR UPDATE
TO public, anon, authenticated
USING (bucket_id = 'fotosPerfil' OR bucket_id = 'FotosPerfil')
WITH CHECK (bucket_id = 'fotosPerfil' OR bucket_id = 'FotosPerfil');

-- G. POLÍTICA 4: DELETE (Permitir eliminar fotos anteriores)
CREATE POLICY "Permitir eliminacion fotosPerfil"
ON storage.objects
FOR DELETE
TO public, anon, authenticated
USING (bucket_id = 'fotosPerfil' OR bucket_id = 'FotosPerfil');

-- 7. POLÍTICAS DE RLS PARA TABLAS DE LA APP (app_users)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura app_users" ON app_users;
DROP POLICY IF EXISTS "Permitir insercion app_users" ON app_users;
DROP POLICY IF EXISTS "Permitir actualizacion app_users" ON app_users;
DROP POLICY IF EXISTS "Permitir eliminacion app_users" ON app_users;

CREATE POLICY "Permitir lectura app_users" ON app_users FOR SELECT TO public, anon, authenticated USING (true);
CREATE POLICY "Permitir insercion app_users" ON app_users FOR INSERT TO public, anon, authenticated WITH CHECK (true);
CREATE POLICY "Permitir actualizacion app_users" ON app_users FOR UPDATE TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir eliminacion app_users" ON app_users FOR DELETE TO public, anon, authenticated USING (true);


