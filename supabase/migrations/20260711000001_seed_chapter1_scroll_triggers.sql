-- =============================================================================
-- Chapter 1: scroll-transition triggers  (DATA-FIX #9 of docs/chapter1-parity)
-- Migration: 20260711000001_seed_chapter1_scroll_triggers.sql
--
-- WHAT IT DOES: sets paragraphs.animation_trigger = 'scroll' on the two intro
--   paragraphs that should scroll-drive their section transition. useChapter maps
--   `transition = (animation_trigger === 'scroll')`, and SectionComp appends
--   "Transition" to the base animation name to build the scroll anchor. With no
--   DB row set to 'scroll', every tree `transition` is false and the
--   IllustrationTransition / scroll anchor is never emitted.
--
-- The two intended scroll-drivers are the intro paragraphs linked to:
--   * animationEyeStructur       (Eye structure section intro)
--   * animationRetinalCellTypes  (Retinal cell types section intro)
-- whose transition assets are animationEyeStructurTransition /
-- animationRetinalCellTypesTransition.
--
-- ⚠️ ROW SELECTION IS THE RISKY PART. There is no natural key for "the intro
--    paragraph". This migration therefore runs in TWO deliberate steps:
--
--    STEP 1 (safe, always runs): prints the candidate paragraph rows so a human
--            can confirm the correct target IDs. Nothing is written.
--    STEP 2 (commented out): the actual UPDATE, by explicit paragraph id. Anton
--            fills in the ids printed by STEP 1, uncomments, and re-runs.
--
--    Setting animation_trigger='scroll' twice is a no-op, so STEP 2 is idempotent.
--
-- RUN with service_role / superuser. Review STEP 1 output before enabling STEP 2.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1 — inspect candidates (READ-ONLY). Each row is a paragraph currently
-- linked to one of the two base animations, with enough context to identify the
-- intro paragraph (lowest order_index in its section is typically the intro).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Candidate scroll-trigger paragraphs (confirm the intended intro rows):';
  FOR r IN
    SELECT p.id            AS paragraph_id,
           p.order_index,
           p.section_id,
           s.title         AS section_title,
           a.animation_key,
           p.animation_trigger
    FROM paragraphs p
    JOIN animations a ON a.id = p.animation_id
    LEFT JOIN sections s ON s.id = p.section_id
    WHERE a.animation_key IN ('animationEyeStructur', 'animationRetinalCellTypes')
    ORDER BY a.animation_key, p.order_index
  LOOP
    RAISE NOTICE '  paragraph_id=% order=% section=% key=% trigger=%',
      r.paragraph_id, r.order_index, r.section_title, r.animation_key, r.animation_trigger;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- STEP 2 — apply (idempotent). After confirming the correct paragraph ids from
-- STEP 1's NOTICE output, replace the placeholder UUIDs below and UNCOMMENT.
-- ---------------------------------------------------------------------------
-- BEGIN;
--   UPDATE paragraphs
--      SET animation_trigger = 'scroll'
--    WHERE id IN (
--      '00000000-0000-0000-0000-000000000000',  -- EyeStructur intro paragraph_id
--      '00000000-0000-0000-0000-000000000000'   -- RetinalCellTypes intro paragraph_id
--    );
-- COMMIT;
