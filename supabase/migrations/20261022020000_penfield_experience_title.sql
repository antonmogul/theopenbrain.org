-- R09: presentation copy only. Apply separately from the code deployment.
-- Preserve all other blocks/fields and any title edited since the known copy.
-- The predicate makes a second application a true no-op (including updated_at).
update public.paragraphs p
set content = jsonb_set(p.content, '{blocks}', (
  select jsonb_agg(
    case when b->>'type' = 'widget'
           and b->>'widgetId' = 'case-cabinet'
           and b->>'title' = 'Be Penfield'
      then jsonb_set(b, '{title}', '"Find out what it was like to be Dr. Wilder Penfield"'::jsonb)
      else b end order by ordinal
  )
  from jsonb_array_elements(p.content->'blocks') with ordinality as blocks(b, ordinal)
)), updated_at = now()
from public.sections s join public.modules m on m.id = s.module_id
where p.section_id = s.id
  and m.slug = 'foundations-of-neuroscience'
  and jsonb_typeof(p.content->'blocks') = 'array'
  and p.content->'blocks' @> '[{"type":"widget","widgetId":"case-cabinet","title":"Be Penfield"}]'::jsonb;
