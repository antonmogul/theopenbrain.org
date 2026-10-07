-- OPENBRAIN-70: schema for the CMS editing work (A3/A4, B4, B5).
--
-- 1. Breakout box placement (A3, A4). A box is a section slugged box-*.
--    parent_section_id: the main section it belongs to (the reader shows it
--    after that section and nests it in the contents); anchor_paragraph_id:
--    the paragraph of that section it follows. Both optional; a deleted
--    target just unplaces the box.
-- 2. media_type 'widget' (B5): an interactive widget as a paragraph's
--    figure in the left panel (config.widgetId).
-- 3. The chapter-media bucket accepts Lottie animations (B4) as
--    application/json, alongside the four image types.
--
-- Idempotent. No BEGIN/COMMIT.

alter table public.sections
  add column if not exists parent_section_id uuid
    references public.sections(id) on delete set null,
  add column if not exists anchor_paragraph_id uuid
    references public.paragraphs(id) on delete set null;

comment on column public.sections.parent_section_id is
  'Breakout boxes (slug box-*): the main section this box belongs to.';
comment on column public.sections.anchor_paragraph_id is
  'Breakout boxes: the paragraph of the parent section the box follows.';

alter table public.animations drop constraint if exists animations_media_type_check;
alter table public.animations add constraint animations_media_type_check
  check (media_type = any (array[
    'lottie', 'video', 'image', 'youtube', 'gsap', 'css', 'widget'
  ]));

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/json'
]
where id = 'chapter-media';

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sections'
      and column_name in ('parent_section_id', 'anchor_paragraph_id')
    group by table_name having count(*) = 2
  ) then
    raise exception 'OPENBRAIN-70: box placement columns missing';
  end if;
  if not exists (
    select 1 from storage.buckets
    where id = 'chapter-media'
      and 'application/json' = any (allowed_mime_types)
  ) then
    raise exception 'OPENBRAIN-70: chapter-media does not accept JSON';
  end if;
end $$;
