-- ============================================================
-- Global Connect — Storage bucket para imágenes de establecimientos
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- Crear bucket público para imágenes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'establishments',
  'establishments',
  true,
  5242880, -- 5 MB máximo por imagen
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquiera puede VER las imágenes (bucket público)
CREATE POLICY "Imágenes públicas visibles para todos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'establishments' );

-- Política: solo admins pueden SUBIR imágenes
CREATE POLICY "Solo admins pueden subir imágenes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'establishments'
  AND (SELECT is_admin())
);

-- Política: solo admins pueden ACTUALIZAR imágenes
CREATE POLICY "Solo admins pueden actualizar imágenes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'establishments'
  AND (SELECT is_admin())
);

-- Política: solo admins pueden ELIMINAR imágenes
CREATE POLICY "Solo admins pueden eliminar imágenes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'establishments'
  AND (SELECT is_admin())
);
