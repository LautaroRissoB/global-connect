-- =============================================================
-- Global Connect — Avatars bucket + exchange_university column
-- Ejecutar en: Supabase → SQL Editor
-- =============================================================

-- Agregar exchange_university a profiles si no existe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exchange_university TEXT;

-- Bucket público para avatars de usuarios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Cualquiera puede ver los avatars (bucket público)
CREATE POLICY "Avatars son visibles para todos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Cada usuario solo puede subir su propio avatar (carpeta = userId)
CREATE POLICY "Usuarios pueden subir su propio avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Cada usuario solo puede actualizar su propio avatar
CREATE POLICY "Usuarios pueden actualizar su propio avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Cada usuario solo puede eliminar su propio avatar
CREATE POLICY "Usuarios pueden eliminar su propio avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
