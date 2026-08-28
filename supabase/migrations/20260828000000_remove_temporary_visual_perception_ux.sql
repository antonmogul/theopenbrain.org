-- Remove Anton's temporary Visual Perception and UX module.
--
-- This is intentionally a forward-only, exact-slug cleanup. Historical seed
-- migrations remain unchanged because deployed Supabase migrations are
-- immutable. Deleting the module cascades through its owned content; the
-- shared content_versions row (including version 1.0) is never touched.

DO $$
DECLARE
  v_module_ids UUID[];
  v_flashcard_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(id)
  INTO v_module_ids
  FROM modules
  WHERE slug = 'visual-perception-ux';

  IF COALESCE(CARDINALITY(v_module_ids), 0) = 0 THEN
    RAISE NOTICE 'No module with slug visual-perception-ux found; nothing to remove.';
    RETURN;
  END IF;

  SELECT ARRAY_AGG(id)
  INTO v_flashcard_ids
  FROM flashcards
  WHERE module_id = ANY(v_module_ids);

  -- flashcard_sessions.module_id was added without an ON DELETE action in the
  -- demo schema migration, so clear it before deleting the module.
  UPDATE flashcard_sessions
  SET module_id = NULL
  WHERE module_id = ANY(v_module_ids);

  -- card_ids is an array rather than a foreign key. Remove IDs owned by the
  -- temporary module so retained sessions cannot reference deleted cards.
  IF COALESCE(CARDINALITY(v_flashcard_ids), 0) > 0 THEN
    UPDATE flashcard_sessions AS flashcard_session
    SET card_ids = ARRAY(
      SELECT card_id
      FROM UNNEST(flashcard_session.card_ids) WITH ORDINALITY AS card(card_id, position)
      WHERE NOT card_id = ANY(v_flashcard_ids)
      ORDER BY position
    )
    WHERE flashcard_session.card_ids && v_flashcard_ids;
  END IF;

  DELETE FROM modules
  WHERE slug = 'visual-perception-ux'
    AND id = ANY(v_module_ids);

  RAISE NOTICE 'Removed % visual-perception-ux module(s).', CARDINALITY(v_module_ids);
END
$$;
