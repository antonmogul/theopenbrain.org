-- OPENBRAIN-70: History (foundations-of-neuroscience) content from the
-- authors' manuscript (Foundations_ST7_NM3_LL.docx).
--
-- Box placement: Stuart Trenholm's manuscript comments place five of the
-- eight breakout boxes, each on a specific paragraph:
--   "Have a breakout box here about hippocrates and epilepsy"   → §1
--   "Have breakout box here on humoral theory"                  → §1
--   "Descartes breakout box here"                               → §2
--   "Penfield breakout box here"                                → §2
--   "Add breakout box about Rita Levi Montalcini and NGF…"      → §3
-- The rete mirabile, psychosurgery and Mary Rafferty boxes have no comment
-- and stay unplaced (end of the chapter) until the authors decide; the
-- chapter page places them.
--
-- Authors: the manuscript's byline. Editable on the chapter page.
--
-- Needs 20260924030000 (the placement columns). Idempotent. No BEGIN/COMMIT.

with chapter as (
  select id from public.modules where slug = 'foundations-of-neuroscience'
),
secs as (
  select s.id, s.slug from public.sections s join chapter c on s.module_id = c.id
),
anchor(box_slug, parent_slug, text_start) as (
  values
    ('box-sacred-disease', 'where-is-my-mind', 'In the 5th century BCE, Hippocrates of Cos'),
    ('box-humoral-theory', 'where-is-my-mind', 'In the 5th century BCE, Hippocrates of Cos'),
    ('box-descartes', 'do-different-parts', 'René Descartes, a contemporary of Willis'),
    ('box-penfield', 'do-different-parts', 'Lashley’s conclusions on a lack of localization'),
    ('box-ngf', 'basic-functional-unit', 'Then, one day in 1887, while visiting his colleague')
)
update public.sections box
set
  parent_section_id = parent.id,
  anchor_paragraph_id = (
    select p.id from public.paragraphs p
    where p.section_id = parent.id
      and p.content_text like a.text_start || '%'
    order by p.order_index
    limit 1
  ),
  updated_at = now()
from anchor a
join secs parent on parent.slug = a.parent_slug
where box.slug = a.box_slug
  and box.module_id = (select id from chapter);

update public.modules
set
  authors = $a$[
    {"name": "Naguib Mechawar", "affiliation": "Douglas Mental Health University Institute; Department of Psychiatry, McGill University"},
    {"name": "Stuart Trenholm", "affiliation": "Montreal Neurological Institute, McGill University"}
  ]$a$::jsonb,
  updated_at = now()
where slug = 'foundations-of-neuroscience'
  and (authors is null or authors = '[]'::jsonb);

do $$
declare
  placed int;
begin
  select count(*) into placed
  from public.sections
  where module_id = (select id from public.modules where slug = 'foundations-of-neuroscience')
    and slug in ('box-sacred-disease', 'box-humoral-theory', 'box-descartes', 'box-penfield', 'box-ngf')
    and parent_section_id is not null
    and anchor_paragraph_id is not null;
  if placed is distinct from 5 then
    raise exception 'History boxes: expected 5 placed on their paragraphs, got %', placed;
  end if;
end $$;
