-- OPENBRAIN-32: chapter cover image for the opener hero. The reader resolves
-- modules.cover_image_url first and falls back to a code-side slug map
-- (src/helper/chapterCover.js), so this column may stay NULL until a cover is
-- chosen per chapter. Idempotent.

alter table public.modules
  add column if not exists cover_image_url text;

comment on column public.modules.cover_image_url is
  'Full-bleed hero image for the chapter opener (absolute URL or /publicAssets path). NULL falls back to the code-side slug map, then the neutral default.';
