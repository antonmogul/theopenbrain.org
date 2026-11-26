-- OPENBRAIN-96: additive, owner-only reader context; safe before the app deploy.
-- No service role or creator read policy: future aggregate access is separate.
CREATE TABLE IF NOT EXISTS public.reader_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('video_play', 'widget_open', 'figure_expand')),
  ref text NOT NULL CHECK (length(ref) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Abort rather than silently accept an unrelated pre-existing table.
DO $$
BEGIN
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public'
      AND table_name='reader_events' AND column_name IN ('id','user_id','module_id','kind','ref','created_at')) <> 6 THEN
    RAISE EXCEPTION 'reader_events schema mismatch; inspect before applying';
  END IF;
END $$;
ALTER TABLE public.reader_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reader_events FROM anon, authenticated;
GRANT SELECT, INSERT ON public.reader_events TO authenticated;
DROP POLICY IF EXISTS reader_events_owner_select ON public.reader_events;
CREATE POLICY reader_events_owner_select ON public.reader_events FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS reader_events_owner_insert ON public.reader_events;
CREATE POLICY reader_events_owner_insert ON public.reader_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.modules m WHERE m.id = module_id AND m.status = 'published'));
CREATE INDEX IF NOT EXISTS reader_events_user_created ON public.reader_events (user_id, created_at DESC);
