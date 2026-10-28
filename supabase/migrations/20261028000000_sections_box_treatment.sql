-- OPENBRAIN-157: a breakout box's colour, chosen per box in the chapter
-- editor. Anton asked to pick a box's colour from the admin: dark, a lighter
-- dark, or the chapter's own colour.
--
-- sections.box_treatment holds one of the treatments in
-- src/helper/breakoutTreatment.js, or null for Automatic (the chapter's map
-- in that file, else the pale card):
--   pale     today's card, the chapter's palest tone with ink text
--   dark     --color-dark-surface (#1C1C1C), white text
--   plate    --color-dark-surface-2 (#2A2A2A), white text
--   chapter  the chapter's own colour, its ink chosen by the ramp
-- Magenta is deliberately not a value: it is the book's interaction accent.
-- The reader already reads the column (chapterTransform passes it through
-- as the section's `treatment`, which wins over the map), so a box changes
-- colour the moment a creator saves it. Only box-* sections carry it; the
-- editor offers the control on those alone.
--
-- Idempotent. No BEGIN/COMMIT. RLS is unchanged: creators are the only
-- writers of sections (20260923000000_rls_lockdown_content_and_profiles).

alter table public.sections
  add column if not exists box_treatment text;

alter table public.sections
  drop constraint if exists sections_box_treatment_check;
alter table public.sections
  add constraint sections_box_treatment_check
  check (
    box_treatment is null
    or box_treatment in ('pale', 'dark', 'plate', 'chapter')
  );

comment on column public.sections.box_treatment is
  'Breakout boxes (slug box-*): the colour panel the box renders in (pale, dark, plate, chapter), or null for the chapter''s default (src/helper/breakoutTreatment.js).';
