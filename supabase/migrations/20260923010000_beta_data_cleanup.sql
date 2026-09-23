-- Clear test data a beta tester would see in the creator console (OPENBRAIN-52).
--
-- Every delete is by exact id and re-checks at run time that the row is still
-- unused, so running this after someone has started using a row is a no-op
-- for that row, not a data loss. Nothing in the reader changes.
--
--   1. Two empty quizzes ("new quiz", "This is a title"): 0 questions,
--      0 attempts. The Retina quiz (8 questions, 3 attempts) is untouched.
--   2. Three seed content versions (v1.1, v2.0, v2.1) that hold no chapters.
--      modules.content_version_id cascades on delete, so each is re-checked
--      for chapters first. v1.0, which holds every chapter, stays a draft
--      because the Chapter Wizard files new chapters under the first draft
--      version; only its stale release notes change.
--   3. Attention's description, which the opener shows as the subtitle and
--      which repeated the title: "Attention and Working Memory: Attention and
--      Working Memory — by Arjun Krishnaswamy (draft)."
--
-- Media is deliberately left alone. Every duplicate-looking row checked on
-- 23 Sep is still referenced by a paragraph, a section, figure states or the
-- animations.json fallback.

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 1. Empty quizzes
  DELETE FROM quizzes q
  WHERE q.id IN (
      '4ef203d4-4b18-4d7c-be02-481ced60aeb8', -- "new quiz"
      '2d717401-5c91-4c5a-bb3c-cb4b862ccf91'  -- "This is a title"
    )
    AND NOT EXISTS (SELECT 1 FROM quiz_questions x WHERE x.quiz_id = q.id)
    AND NOT EXISTS (SELECT 1 FROM quiz_attempts x WHERE x.quiz_id = q.id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Removed % empty quiz(zes).', v_count;

  -- 2. Seed versions with no chapters
  DELETE FROM content_versions v
  WHERE v.id IN (
      'a0000001-0001-0001-0001-000000000002', -- v1.1 (archived)
      'a0000001-0001-0001-0001-000000000003', -- v2.0 (published, empty)
      'a0000001-0001-0001-0001-000000000004'  -- v2.1 (draft, empty)
    )
    AND NOT EXISTS (SELECT 1 FROM modules m WHERE m.content_version_id = v.id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Removed % empty content version(s).', v_count;

  UPDATE content_versions
  SET release_notes = 'The current book: Foundations of Neuroscience, The Retina, and Attention and Working Memory (draft).'
  WHERE id = '3899a199-ac71-4438-8dcd-313aa7f20130'
    AND release_notes LIKE 'Initial release of Chapter 2: Visual Perception and UX%';

  -- 3. Attention subtitle
  UPDATE modules
  SET description = 'by Arjun Krishnaswamy',
      updated_at = NOW()
  WHERE slug = 'attention-and-working-memory'
    AND description = 'Attention and Working Memory — by Arjun Krishnaswamy (draft).';
END $$;

-- Self-check: the rows that must survive did.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM quizzes WHERE id = 'c0000001-0001-0001-0001-000000000001'
  ) THEN
    RAISE EXCEPTION 'beta cleanup: the Retina quiz is missing';
  END IF;
  IF (SELECT COUNT(*) FROM modules) < 3 THEN
    RAISE EXCEPTION 'beta cleanup: fewer than 3 chapters remain';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM content_versions WHERE id = '3899a199-ac71-4438-8dcd-313aa7f20130'
  ) THEN
    RAISE EXCEPTION 'beta cleanup: version 1.0 is missing';
  END IF;
END $$;
