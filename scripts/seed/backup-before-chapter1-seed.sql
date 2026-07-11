-- =============================================================================
-- BACKUP — run BEFORE applying the Chapter 1 seed migrations
--   (20260711000000_seed_chapter1_anim_states.sql + ..._scroll_triggers.sql)
--
-- Creates timestamped snapshot tables in a `backup` schema holding the CURRENT
-- state of everything the seeds touch:
--   * animation_states        (seed #2 wipes+reinserts per key)
--   * animation_variants      (seed #2 wipes+reinserts per key)
--   * animations.config       (seed #6 overwrites config.infoText)
--   * paragraphs.animation_trigger (seed #9 sets some rows to 'scroll')
--
-- RUN with service_role / superuser in the Supabase SQL editor
--   (project ocenwbkdzmxhsvwlornp), BEFORE the seeds. Idempotent-ish:
--   re-running drops+recreates the snapshot (so the LAST run before you seed
--   is the one that matters — run it once, right before seeding).
--
-- RESTORE instructions are at the bottom.
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS backup;

-- Full snapshots of the two tables that get wiped+reinserted -----------------
DROP TABLE IF EXISTS backup.animation_states_pre_ch1seed;
CREATE TABLE backup.animation_states_pre_ch1seed AS
  SELECT * FROM public.animation_states;

DROP TABLE IF EXISTS backup.animation_variants_pre_ch1seed;
CREATE TABLE backup.animation_variants_pre_ch1seed AS
  SELECT * FROM public.animation_variants;

-- Snapshot the animations rows whose config.infoText the seed overwrites.
-- (Keep the whole config jsonb per animation so restore is exact.)
DROP TABLE IF EXISTS backup.animations_config_pre_ch1seed;
CREATE TABLE backup.animations_config_pre_ch1seed AS
  SELECT id, animation_key, config
  FROM public.animations;

-- Snapshot paragraph triggers (migration #9 sets some to 'scroll').
DROP TABLE IF EXISTS backup.paragraphs_trigger_pre_ch1seed;
CREATE TABLE backup.paragraphs_trigger_pre_ch1seed AS
  SELECT id, animation_id, animation_trigger
  FROM public.paragraphs;

-- Sanity: report the snapshot row counts.
DO $$
DECLARE s INT; v INT; a INT; p INT;
BEGIN
  SELECT count(*) INTO s FROM backup.animation_states_pre_ch1seed;
  SELECT count(*) INTO v FROM backup.animation_variants_pre_ch1seed;
  SELECT count(*) INTO a FROM backup.animations_config_pre_ch1seed;
  SELECT count(*) INTO p FROM backup.paragraphs_trigger_pre_ch1seed;
  RAISE NOTICE 'BACKUP done — animation_states=% animation_variants=% animations=% paragraphs=%', s, v, a, p;
  RAISE NOTICE '(Expect animation_states=0 and animation_variants=0 — that empty state is the bug being fixed.)';
END $$;

COMMIT;

-- =============================================================================
-- RESTORE (only if you need to undo the seed) — run in the SQL editor:
--
--   BEGIN;
--     -- animation_states / animation_variants: replace live with the snapshot
--     TRUNCATE public.animation_states;
--     INSERT INTO public.animation_states
--       SELECT * FROM backup.animation_states_pre_ch1seed;
--     TRUNCATE public.animation_variants;
--     INSERT INTO public.animation_variants
--       SELECT * FROM backup.animation_variants_pre_ch1seed;
--
--     -- animations.config: restore per-row from the snapshot
--     UPDATE public.animations a
--        SET config = b.config
--       FROM backup.animations_config_pre_ch1seed b
--      WHERE a.id = b.id;
--
--     -- paragraph triggers: restore per-row
--     UPDATE public.paragraphs p
--        SET animation_trigger = b.animation_trigger
--       FROM backup.paragraphs_trigger_pre_ch1seed b
--      WHERE p.id = b.id;
--   COMMIT;
--
-- (Note: animation_states/variants have FK ON DELETE CASCADE to animations, so
--  TRUNCATE+INSERT of the child tables is safe as long as the parent animations
--  rows still exist — the seed never deletes animations.)
-- =============================================================================
