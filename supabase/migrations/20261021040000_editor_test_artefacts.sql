-- OPENBRAIN-148: two editor tests left in the live chapters.
--
--   1. The first paragraph of foundations-of-neuroscience ends, on
--      production, with " THis is now editable" (saved from the chapter
--      editor on 9 Oct at 13:48, when the editor was tried on the live
--      chapter). Readers see it under the Oliver Sacks quote. Removed from
--      the paragraph's content blocks and from content_text, History only.
--   2. The Retina's section 1 is titled "Story of the eye (EDIT)" (saved
--      24 Sep); the opener TOC and the top bar's section menu show it.
--      The " (EDIT)" goes; the slug stays story-of-the-eye.
--
-- Idempotent: each update finds its text or nothing. No BEGIN/COMMIT.

update public.paragraphs p
   set content = jsonb_set(
         p.content, '{blocks}',
         (select coalesce(jsonb_agg(
                   case when b->>'type' = 'text'
                        then jsonb_set(b, '{content}',
                               to_jsonb(regexp_replace(b->>'content', '\s*THis is now editable\s*$', '')))
                        else b end
                   order by o), '[]'::jsonb)
            from jsonb_array_elements(p.content->'blocks') with ordinality as t(b, o))),
       content_text = regexp_replace(p.content_text, '\s*THis is now editable\s*$', ''),
       updated_at = now()
  from public.sections s
  join public.modules m on m.id = s.module_id
 where p.section_id = s.id
   and m.slug = 'foundations-of-neuroscience'
   and (p.content_text ~ 'THis is now editable'
        or p.content::text like '%THis is now editable%');

update public.sections s
   set title = regexp_replace(s.title, '\s*\(EDIT\)\s*$', ''),
       updated_at = now()
  from public.modules m
 where m.id = s.module_id
   and m.slug = 'the-retina'
   and s.slug = 'story-of-the-eye'
   and s.title ~ '\(EDIT\)\s*$';
