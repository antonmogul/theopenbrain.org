-- OPENBRAIN-66: the chapter title already lives in the opener. Like History,
-- the introductory section should name its role in the contents and prose.
-- Guard only the title being changed, preserving any author's later edit.
update public.sections s
set title = 'Introduction', updated_at = now()
from public.modules m
where s.module_id = m.id
  and m.slug = 'the-retina'
  and s.slug = 'introduction'
  and s.title = 'The Retina';
