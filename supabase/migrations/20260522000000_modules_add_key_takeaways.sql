-- Track 3: end-of-chapter "Key takeaways" content per chapter.
-- Array of short strings rendered as bullets in EndOfChapterCallout.
-- NULL = no takeaways saved yet → callout hides the takeaways band.

alter table public.modules
  add column if not exists key_takeaways text[];

comment on column public.modules.key_takeaways is
  'Short bulleted summary shown in the end-of-chapter callout. Edited from Creator dashboard. NULL hides the band.';
