-- OPENBRAIN-128: trending_highlights counts readers, only for text that is
-- in the chapter, only shows published chapters, and sharing a highlight no
-- longer publishes the highlight row itself.
--
-- The chapter timeline shows every reader the passages others have shared
-- ("12 readers highlighted: '…'"), and the highlight toolbar now lets a
-- reader share or unshare a highlight after making it ("Share with
-- readers": "Counts toward Trending. Your name isn't shown."). Before this
-- migration:
--   - the initial-schema policy "Users can view public highlights" (no TO
--     clause) returned every column of a shared row to anyone: user_id,
--     tags, the legacy note, timestamps. Any signed-in user can resolve
--     user_id to a name and email through profiles.
--   - the trigger only counted up (AFTER INSERT WHEN is_public, +1 per row):
--     unsharing or deleting left the count, and sharing an existing
--     highlight never counted. It counted ROWS, so one account could post a
--     passage N times, and it kept whatever selected_text the client sent.
--   - trending_highlights was readable by everyone (20260923020000), so a
--     creator sharing a highlight on a draft chapter published draft text.
--
-- 1. Highlight rows: only their owner and creators read them.
--    Every permissive SELECT policy on highlights is dropped (by
--    pg_policies, as 20260923000000 does, so a dashboard-made copy goes
--    too), including "Users can view public highlights", except an owner
--    policy. Owners keep their rows through "Users manage own highlights"
--    (FOR ALL, auth.uid() = user_id). An owner policy is one whose USING is
--    auth.uid() = user_id, either way round and with or without the
--    (SELECT auth.uid()) wrapper the Supabase advisor suggests: its qual,
--    lower-cased, without SELECT, "AS uid", spaces and parentheses, is
--    auth.uid=user_id or user_id=auth.uid. Creators get "Creators read
--    shared highlights": SELECT on is_public rows only, so they can
--    moderate Trending without reading anyone's private highlights. Nothing
--    in src/ reads another user's highlight row: every query filters
--    user_id=eq.<me> or id=eq.<own id>, and Trending is read from
--    trending_highlights. Other readers never see who shared.
--
-- 2. trending_highlights holds, per passage (paragraph_id, start_offset,
--    end_offset), the number of DISTINCT READERS (user_id) with a public
--    highlight there whose text is in the paragraph:
--      The passage text rule. A public highlight counts only if its
--      selected_text, whitespace-normalised (NBSP to space, runs of
--      whitespace to one space, trimmed; trending_squash), occurs in the
--      whitespace-normalised text the paragraph shows in the reader
--      (trending_paragraph_text) or in its content_text. content_text alone
--      is not enough: the seeds store it as a search snippet cut at 200 or
--      500 characters. trending_paragraph_text mirrors contentBlocksToHTML
--      (src/composables/chapterTransform.mjs), whose HTML the reader shows
--      with v-html and whose textContent the selection offsets index:
--      citation numbers ("cells17,21."), "Figure N" labels, `**` markdown
--      taken out; then tags removed (a block tag or <br> becomes a space,
--      as the browser's selection text has a line break there), the common
--      named entities decoded (&nbsp; &amp; &lt; &gt; &quot; &apos; &#39;
--      &mdash; &ndash; &hellip; and curly quotes). Anything it does not
--      model (another entity, CSS-hidden text) fails closed: the highlight
--      is not counted. The check runs when a highlight is shared, moved or
--      changed; a later edit to the paragraph does not recount it.
--    The shown text is the whitespace-normalised text the most counted
--    readers chose; a tie goes to the shortest, then the first in byte
--    order. It is always text from the paragraph, and no one account can
--    pick it for a passage others share (the earliest sharer's text could
--    be: a client sets created_at). last_highlighted_at is the latest
--    created_at/updated_at among the counted highlights.
--
--    trending_refresh_passage() recomputes one passage from highlights
--    (count 0: the row is deleted) instead of adding or subtracting 1. The
--    trigger function update_trending_highlights() refreshes the old
--    passage (UPDATE, DELETE) and the new one (INSERT, UPDATE). Before
--    that it takes a transaction advisory lock per passage, in sorted order
--    (no deadlock when two updates move highlights between the same two
--    passages): a second writer on the passage waits for the first to
--    commit, and under READ COMMITTED its recount then sees the first's
--    row. Still SECURITY DEFINER with a pinned search_path
--    (20260923020000): readers have no write access to trending_highlights
--    and cannot read other readers' highlights, but the recount must.
--    CREATE OR REPLACE resets every property it does not name, so both are
--    restated. The helpers run as the trigger's owner; none is callable
--    over /rest/v1/rpc.
--
-- 3. Three triggers share the function. Their WHEN clauses keep private
--    highlights, and updates that only touch colour, tags or the note, out
--    of it. highlight_trending_update keeps its initial-schema name (it is
--    still the INSERT trigger).
--
-- 4. Reading trending_highlights: "Anyone reads trending highlights"
--    (USING true) becomes "Read trending passages of published chapters":
--    a row is visible when its paragraph's module is published, or to a
--    creator. That is the paragraphs rule (20260923000000), so a shared
--    draft passage is no more visible than the draft itself. The creator
--    test is an InitPlan, evaluated once per query; the published test is
--    primary-key lookups paragraph -> section -> module per row, at most
--    the 200 rows the timeline asks for.
--
-- 5. Rebuild the table from highlights WHERE is_public, through the same
--    refresh. This drops counts that drifted under the insert-only trigger,
--    duplicates by one reader, text that is not in its paragraph, and the
--    fixture rows supabase/seed_dashboard_data.sql writes straight into the
--    table (they have no highlights behind them). `supabase db push` runs
--    the file in one transaction and CREATE TRIGGER locks highlights
--    against writes until it commits, so no highlight saved meanwhile is
--    missed or counted twice.
--
-- 6. public.trending_sharing_ready() returns true: signed-in readers
--    only (EXECUTE revoked from PUBLIC and anon), SECURITY INVOKER. The
--    frontend can be live before this is pushed, and until then the old
--    policy would expose a shared row, so the toolbar shows "Share with
--    readers" only once this answers (useTrendingSharing.js). Before the
--    push the call is a 404 (PGRST202) and the switch stays hidden.
--
-- Deploy note: check pg_policies on highlights before pushing; the
-- self-check names any policy it will not accept.
--
-- Idempotent: DROP ... IF EXISTS, CREATE OR REPLACE, and a rebuild that
-- gives the same result however often it runs.
--
-- Tested in PGlite against the real schema migrations:
-- src/__tests__/trendingHighlightsSync.sql.test.js.

-- 1. Highlight rows (the owner test is repeated in the self-check)
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'highlights'
       AND cmd = 'SELECT'
       AND permissive = 'PERMISSIVE'
       AND regexp_replace(
             regexp_replace(lower(COALESCE(qual, '')), '\mselect\M|\mas uid\M', '', 'g'),
             '[[:space:]()]', '', 'g'
           ) NOT IN ('auth.uid=user_id', 'user_id=auth.uid')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.highlights', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Creators read shared highlights"
  ON public.highlights FOR SELECT TO authenticated
  USING (is_public IS TRUE AND (SELECT public.is_creator()));

-- 2. The passage text rule and the recount
DROP TRIGGER IF EXISTS highlight_trending_update ON public.highlights;
DROP TRIGGER IF EXISTS highlight_trending_delete ON public.highlights;
DROP TRIGGER IF EXISTS highlight_trending_change ON public.highlights;

-- NBSP to space, runs of whitespace to one space, trimmed.
CREATE OR REPLACE FUNCTION public.trending_squash(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT btrim(regexp_replace(translate(COALESCE(p_text, ''), chr(160), ' '), '\s+', ' ', 'g'));
$$;

-- The text a paragraph shows in the reader (see 2. above).
CREATE OR REPLACE FUNCTION public.trending_paragraph_text(p_content jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH blocks AS (
    SELECT b.block,
           b.ord,
           lag(b.block ->> 'type') OVER (ORDER BY b.ord) AS prev_type
      FROM jsonb_array_elements(
             CASE WHEN jsonb_typeof(p_content -> 'blocks') = 'array'
                  THEN p_content -> 'blocks' ELSE '[]'::jsonb END
           ) WITH ORDINALITY AS b(block, ord)
  ),
  html AS (
    SELECT COALESCE(string_agg(
      CASE
        WHEN jsonb_typeof(block) <> 'object' THEN ''
        WHEN block ->> 'type' = 'heading'
          THEN '<h2>' || COALESCE(block ->> 'content', '') || '</h2>'
        -- markdownBoldToHtml: **x** becomes <strong>x</strong>, stray ** go.
        WHEN block ->> 'type' IN ('text', 'paragraph')
          THEN regexp_replace(
                 regexp_replace(COALESCE(block ->> 'content', ''),
                                '\*\*([^*\n]+)\*\*', '\1', 'g'),
                 '\*{2,}', '', 'g')
        WHEN block ->> 'type' = 'code'
          THEN '<pre>' || COALESCE(block ->> 'content', '') || '</pre>'
        WHEN block ->> 'type' = 'list'
          THEN '<ul>' || COALESCE((
                 SELECT string_agg('<li>' || i.item || '</li>', '' ORDER BY i.n)
                   FROM jsonb_array_elements_text(
                          CASE WHEN jsonb_typeof(block -> 'items') = 'array'
                               THEN block -> 'items' ELSE '[]'::jsonb END
                        ) WITH ORDINALITY AS i(item, n)
               ), '') || '</ul>'
        WHEN block ->> 'type' = 'blockquote'
          THEN '<blockquote>' || COALESCE(block ->> 'content', '') || '</blockquote>'
        -- A run of citations reads 2,3 (the comma is aria-hidden, not CSS-hidden).
        WHEN block ->> 'type' = 'citation_ref'
          THEN CASE WHEN prev_type = 'citation_ref' THEN ',' ELSE '' END
               || COALESCE(block ->> 'number', '')
        WHEN block ->> 'type' = 'figure_placeholder'
          THEN 'Figure' || COALESCE(' ' || (block ->> 'number'), '')
        WHEN block ->> 'type' IN (
          'image', 'animation', 'animation_full', 'break_section', 'break_video',
          'further_reading', 'footnote', 'widget'
        ) THEN ''
        ELSE COALESCE(block ->> 'content', '')
      END, '' ORDER BY ord), '') AS h
    FROM blocks
  ),
  stripped AS (
    SELECT regexp_replace(
             regexp_replace(h,
               '<(br|hr|/?(p|div|li|ul|ol|h[1-6]|blockquote|pre|table|tr|td|th))([[:space:]/][^>]*)?>',
               ' ', 'gi'),
             '<[A-Za-z/!?][^>]*>', '', 'g') AS t
      FROM html
  )
  SELECT public.trending_squash(
           replace(replace(replace(replace(replace(replace(replace(replace(
           replace(replace(replace(replace(replace(replace(replace(t,
             '&nbsp;', chr(160)), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'),
             '&apos;', ''''), '&#39;', ''''), '&mdash;', '—'), '&ndash;', '–'),
             '&hellip;', '…'), '&lsquo;', '‘'), '&rsquo;', '’'), '&ldquo;', '“'),
             '&rdquo;', '”'), '&#160;', chr(160)), '&amp;', '&'))
    FROM stripped;
$$;

-- The passage text rule: does this selected text occur in the paragraph?
CREATE OR REPLACE FUNCTION public.trending_text_in_paragraph(
  p_selected text, p_content jsonb, p_content_text text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT public.trending_squash(p_selected) <> ''
     AND (
       strpos(public.trending_paragraph_text(p_content), public.trending_squash(p_selected)) > 0
       OR strpos(public.trending_squash(p_content_text), public.trending_squash(p_selected)) > 0
     );
$$;

-- Recount one passage from highlights; 0 readers removes its row.
CREATE OR REPLACE FUNCTION public.trending_refresh_passage(
  p_paragraph_id uuid, p_start integer, p_end integer
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_readers integer;
  v_text text;
  v_last timestamptz;
BEGIN
  WITH counted AS (
    SELECT h.user_id,
           public.trending_squash(h.selected_text) AS shown,
           GREATEST(h.created_at, h.updated_at) AS touched_at
      FROM public.highlights h
      JOIN public.paragraphs p ON p.id = h.paragraph_id
     WHERE h.paragraph_id = p_paragraph_id
       AND h.start_offset = p_start
       AND h.end_offset = p_end
       AND h.is_public IS TRUE
       AND public.trending_text_in_paragraph(h.selected_text, p.content, p.content_text)
  )
  SELECT (SELECT COUNT(DISTINCT user_id)::integer FROM counted),
         -- The text most readers chose. A tie: text as long as the
         -- highlighted span (a genuine selection of it), then the shortest,
         -- then byte order, so one account can't swap in a shorter word.
         (SELECT shown FROM counted
           GROUP BY shown
           ORDER BY COUNT(DISTINCT user_id) DESC,
                    (length(shown) = p_end - p_start) DESC,
                    length(shown), shown COLLATE "C"
           LIMIT 1),
         (SELECT MAX(touched_at) FROM counted)
    INTO v_readers, v_text, v_last;

  IF v_readers = 0 THEN
    DELETE FROM public.trending_highlights
     WHERE paragraph_id = p_paragraph_id
       AND start_offset = p_start
       AND end_offset = p_end;
    RETURN;
  END IF;

  INSERT INTO public.trending_highlights (
    paragraph_id, selected_text, start_offset, end_offset,
    highlight_count, last_highlighted_at, updated_at
  )
  VALUES (
    p_paragraph_id, v_text, p_start, p_end,
    v_readers, COALESCE(v_last, NOW()), NOW()
  )
  ON CONFLICT (paragraph_id, start_offset, end_offset)
  DO UPDATE SET
    selected_text = EXCLUDED.selected_text,
    highlight_count = EXCLUDED.highlight_count,
    last_highlighted_at = EXCLUDED.last_highlighted_at,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.update_trending_highlights()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_keys bigint[] := '{}';
  v_key bigint;
BEGIN
  -- OLD is NULL on INSERT and NEW on DELETE, hence the TG_OP tests.
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_keys := v_keys || hashtextextended(
      OLD.paragraph_id::text || ':' || OLD.start_offset || ':' || OLD.end_offset, 0);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_keys := v_keys || hashtextextended(
      NEW.paragraph_id::text || ':' || NEW.start_offset || ':' || NEW.end_offset, 0);
  END IF;
  FOR v_key IN SELECT DISTINCT k FROM unnest(v_keys) AS k ORDER BY k LOOP
    PERFORM pg_advisory_xact_lock(v_key);
  END LOOP;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.trending_refresh_passage(OLD.paragraph_id, OLD.start_offset, OLD.end_offset);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.trending_refresh_passage(NEW.paragraph_id, NEW.start_offset, NEW.end_offset);
  END IF;

  -- AFTER row trigger: the return value is ignored.
  RETURN NULL;
END;
$$;

-- Trigger functions don't need EXECUTE at fire time, and the helpers run as
-- the trigger's owner; this only keeps them all off /rest/v1/rpc.
REVOKE EXECUTE ON FUNCTION public.update_trending_highlights() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trending_refresh_passage(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trending_text_in_paragraph(text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trending_paragraph_text(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trending_squash(text) FROM PUBLIC, anon, authenticated;

-- 3. The triggers
CREATE TRIGGER highlight_trending_update
  AFTER INSERT ON public.highlights
  FOR EACH ROW
  WHEN (NEW.is_public IS TRUE)
  EXECUTE FUNCTION public.update_trending_highlights();

CREATE TRIGGER highlight_trending_delete
  AFTER DELETE ON public.highlights
  FOR EACH ROW
  WHEN (OLD.is_public IS TRUE)
  EXECUTE FUNCTION public.update_trending_highlights();

-- UPDATE OF fires when a listed column is in the SET list; the WHEN clause
-- then skips rows where nothing that matters actually changed.
CREATE TRIGGER highlight_trending_change
  AFTER UPDATE OF is_public, paragraph_id, start_offset, end_offset, selected_text, user_id
  ON public.highlights
  FOR EACH ROW
  WHEN (
    (OLD.is_public IS TRUE OR NEW.is_public IS TRUE)
    AND (
      OLD.is_public IS DISTINCT FROM NEW.is_public
      OR OLD.paragraph_id IS DISTINCT FROM NEW.paragraph_id
      OR OLD.start_offset IS DISTINCT FROM NEW.start_offset
      OR OLD.end_offset IS DISTINCT FROM NEW.end_offset
      OR OLD.selected_text IS DISTINCT FROM NEW.selected_text
      OR OLD.user_id IS DISTINCT FROM NEW.user_id
    )
  )
  EXECUTE FUNCTION public.update_trending_highlights();

-- 4. Reading trending_highlights
DROP POLICY IF EXISTS "Anyone reads trending highlights" ON public.trending_highlights;
DROP POLICY IF EXISTS "Read trending passages of published chapters" ON public.trending_highlights;
CREATE POLICY "Read trending passages of published chapters"
  ON public.trending_highlights FOR SELECT TO anon, authenticated
  USING (
    (SELECT public.is_creator())
    OR EXISTS (
      SELECT 1
        FROM public.paragraphs p
        JOIN public.sections s ON s.id = p.section_id
        JOIN public.modules m ON m.id = s.module_id
       WHERE p.id = trending_highlights.paragraph_id
         AND m.status = 'published'
    )
  );

-- 5. Rebuild
DELETE FROM public.trending_highlights;

DO $$
DECLARE
  k record;
BEGIN
  FOR k IN
    SELECT DISTINCT paragraph_id, start_offset, end_offset
      FROM public.highlights
     WHERE is_public IS TRUE
  LOOP
    PERFORM public.trending_refresh_passage(k.paragraph_id, k.start_offset, k.end_offset);
  END LOOP;
END $$;

-- 6. The share switch's probe: POST /rest/v1/rpc/trending_sharing_ready
CREATE OR REPLACE FUNCTION public.trending_sharing_ready()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT true;
$$;

REVOKE EXECUTE ON FUNCTION public.trending_sharing_ready() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trending_sharing_ready() TO authenticated;

-- Self-check
DO $$
DECLARE
  v_owner boolean;
  v_other text;
BEGIN
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.update_trending_highlights'::regproc) THEN
    RAISE EXCEPTION 'trending sync: update_trending_highlights is not SECURITY DEFINER';
  END IF;
  IF (
    SELECT COUNT(*) FROM pg_trigger
    WHERE tgrelid = 'public.highlights'::regclass
      AND NOT tgisinternal
      AND tgfoid = 'public.update_trending_highlights'::regproc
      AND tgname IN ('highlight_trending_update', 'highlight_trending_delete', 'highlight_trending_change')
  ) <> 3 THEN
    RAISE EXCEPTION 'trending sync: expected 3 triggers on highlights';
  END IF;
  -- Highlight rows: an owner policy (FOR ALL or FOR SELECT, see 1.) and
  -- the creators' read of shared rows are the only permissive policies
  -- that let anyone SELECT them. Restrictive ones only narrow.
  WITH readable AS (
    SELECT policyname, cmd,
           regexp_replace(
             regexp_replace(lower(COALESCE(qual, '')), '\mselect\M|\mas uid\M', '', 'g'),
             '[[:space:]()]', '', 'g'
           ) IN ('auth.uid=user_id', 'user_id=auth.uid') AS owner
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'highlights'
       AND cmd IN ('SELECT', 'ALL')
       AND permissive = 'PERMISSIVE'
  )
  SELECT COALESCE(bool_or(owner), false),
         string_agg(format('"%s" (%s)', policyname, cmd), ', ' ORDER BY policyname)
           FILTER (WHERE NOT owner
                     AND NOT (policyname = 'Creators read shared highlights' AND cmd = 'SELECT'))
    INTO v_owner, v_other
    FROM readable;
  IF NOT v_owner THEN
    RAISE EXCEPTION 'trending sync: no owner policy (USING auth.uid() = user_id, FOR ALL or FOR SELECT) on highlights; readers would lose their own highlights';
  END IF;
  IF v_other IS NOT NULL THEN
    RAISE EXCEPTION 'trending sync: another policy still lets readers see others'' highlights: %', v_other;
  END IF;
  -- trending_highlights: one read policy, and it is not USING (true).
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'trending_highlights'
      AND (policyname <> 'Read trending passages of published chapters' OR cmd <> 'SELECT')
  ) THEN
    RAISE EXCEPTION 'trending sync: unexpected policy on trending_highlights';
  END IF;
  -- The probe: signed-in readers may call it, anon may not.
  IF has_function_privilege('anon', 'public.trending_sharing_ready()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.trending_sharing_ready()', 'EXECUTE') THEN
    RAISE EXCEPTION 'trending sync: trending_sharing_ready() must be callable by signed-in readers only';
  END IF;
  -- Every passage's count equals its distinct readers with text from the
  -- paragraph, and nothing else is left.
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT h.paragraph_id, h.start_offset, h.end_offset,
             COUNT(DISTINCT h.user_id)::integer AS n
        FROM public.highlights h
        JOIN public.paragraphs p ON p.id = h.paragraph_id
       WHERE h.is_public IS TRUE
         AND public.trending_text_in_paragraph(h.selected_text, p.content, p.content_text)
       GROUP BY h.paragraph_id, h.start_offset, h.end_offset
    ) h
    FULL JOIN public.trending_highlights t
      USING (paragraph_id, start_offset, end_offset)
    WHERE h.n IS DISTINCT FROM t.highlight_count
  ) THEN
    RAISE EXCEPTION 'trending sync: trending_highlights does not match the public highlights';
  END IF;
END $$;
