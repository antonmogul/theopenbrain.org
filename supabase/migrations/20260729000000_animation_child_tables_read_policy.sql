-- =============================================================================
-- Chapter 1 parity — public read policies for animation child tables
-- Migration: 20260729000000_animation_child_tables_read_policy.sql
--
-- WHY: animation_states and animation_variants were created with RLS ENABLED
--   but ZERO policies. Postgres RLS denies by default, so every read with the
--   anon/publishable key returned an empty set — with no error. The seeded rows
--   (93 states, 10 variants) existed and were invisible to the app, leaving all
--   14 interactive Chapter 1 figures inert. The parent `animations` table always
--   had "Anyone can read animations" (USING true); the child tables were missed.
--
-- Chapter content is public, so these mirror the parent's read policy exactly.
-- Writes remain restricted: no INSERT/UPDATE/DELETE policy is granted here, so
-- only service_role (which bypasses RLS) can mutate these tables.
--
-- Idempotent: DROP IF EXISTS then CREATE.
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can read animation states"   ON animation_states;
DROP POLICY IF EXISTS "Anyone can read animation variants" ON animation_variants;

CREATE POLICY "Anyone can read animation states"
  ON animation_states FOR SELECT USING (true);

CREATE POLICY "Anyone can read animation variants"
  ON animation_variants FOR SELECT USING (true);
