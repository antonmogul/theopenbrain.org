-- Image uploads for the chapter editor (OPENBRAIN-63, plan Phase 3).
--
-- A public `chapter-media` bucket: anyone can view files (the reader shows
-- them to every visitor), and only creators can upload, replace or delete.
-- Uploads are images only, 10 MB at most. SVG is left out on purpose: an SVG
-- opened directly can run script on the storage domain.
--
-- Paths are modules/<chapter slug>/<uuid>.<ext>. Each upload also adds an
-- `image` row to public.animations (the media library), written by the app
-- under the existing "Creators can manage animations" policy.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chapter-media',
  'chapter-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Anyone reads chapter media" ON storage.objects;
CREATE POLICY "Anyone reads chapter media"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'chapter-media');

DROP POLICY IF EXISTS "Creators upload chapter media" ON storage.objects;
CREATE POLICY "Creators upload chapter media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chapter-media' AND public.is_creator());

DROP POLICY IF EXISTS "Creators update chapter media" ON storage.objects;
CREATE POLICY "Creators update chapter media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chapter-media' AND public.is_creator())
  WITH CHECK (bucket_id = 'chapter-media' AND public.is_creator());

DROP POLICY IF EXISTS "Creators delete chapter media" ON storage.objects;
CREATE POLICY "Creators delete chapter media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chapter-media' AND public.is_creator());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'chapter-media' AND public) THEN
    RAISE EXCEPTION 'chapter media: bucket missing or not public';
  END IF;
  IF (SELECT COUNT(*) FROM pg_policy
      WHERE polrelid = 'storage.objects'::regclass
        AND polname LIKE '%chapter media%') <> 4 THEN
    RAISE EXCEPTION 'chapter media: expected 4 storage policies';
  END IF;
END $$;
