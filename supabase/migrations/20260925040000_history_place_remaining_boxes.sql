-- OPENBRAIN-91: History's last three breakout boxes, placed in the text.
--
-- Stuart, 24 Sep: "No breakout boxes should hide at the end of the text."
-- Five of History's eight boxes were placed from his manuscript comments
-- (20260924040000); these three had no comment and sat after the last
-- section. Each now follows the paragraph its story belongs to (a creator
-- can move it on the chapter page):
--   rete mirabile / hippocampus minor → Galen's animal dissections
--   Mary Rafferty (Bartholow, 1874)   → Fritsch and Hitzig's stimulation
--   psychosurgery (Burckhardt, 1888)  → Ferrier and the localization debate
--
-- The reader anchors a box only to a section's top-level paragraph, so the
-- check requires that. Only unplaced boxes are touched; idempotent.

begin;

with chapter as (
  select id from public.modules where slug = 'foundations-of-neuroscience'
),
secs as (
  select s.id, s.slug from public.sections s join chapter c on s.module_id = c.id
),
anchor(box_slug, parent_slug, text_start) as (
  values
    ('box-rete-mirabile', 'where-is-my-mind', 'Galen (129-216 CE) argued strongly for the brain'),
    ('box-electrical-stim', 'do-different-parts', 'The next breakthrough came in the early 1870s'),
    ('box-psychosurgery', 'do-different-parts', 'Fritsch and Hitzig’s work was validated soon afterwards')
)
update public.sections box
set
  parent_section_id = parent.id,
  anchor_paragraph_id = (
    select p.id from public.paragraphs p
    where p.section_id = parent.id
      and p.subsection_level = 0
      and p.content_text like anchor.text_start || '%'
    order by p.order_index limit 1
  )
from anchor
join secs b on b.slug = anchor.box_slug
join secs parent on parent.slug = anchor.parent_slug
where box.id = b.id
  and box.parent_section_id is null;

do $$
declare
  n int;
begin
  if not exists (select 1 from public.modules where slug = 'foundations-of-neuroscience') then
    raise notice 'history boxes: no History chapter here, nothing to check';
    return;
  end if;
  select count(*) into n
    from public.sections box
    join public.modules m on m.id = box.module_id
    join public.paragraphs p on p.id = box.anchor_paragraph_id
   where m.slug = 'foundations-of-neuroscience'
     and box.slug in ('box-rete-mirabile', 'box-electrical-stim', 'box-psychosurgery')
     and p.section_id = box.parent_section_id
     and p.subsection_level = 0;
  if n <> 3 then
    raise exception 'history boxes: % of 3 placed on a top-level paragraph', n;
  end if;
end $$;

commit;
