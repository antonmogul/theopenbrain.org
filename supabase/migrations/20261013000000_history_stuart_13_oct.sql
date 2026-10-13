-- OPENBRAIN-138: History changes from Stuart's 13 Oct email.
--
--   Portraits: Descartes, Swedenborg, Willis and Haller came in too early.
--     The gallery moves from do-different-parts ¶4 (the paragraph the
--     Descartes box is anchored to) to ¶5, the first paragraph after the box.
--   Fig 1, Fig 16, H.M.'s brain: the files were re-cut (Fig 1 without the
--     book's "Fig. 3.1" legend, Fig 16 turned 90° clockwise, H.M.'s brain
--     with as much white above as black below). Their URLs gain ?v=2 so a
--     browser's day-long cached copy of the old file isn't shown.
--   Phrenology and Penfield: new headings and taglines on their widget
--     blocks (src/widgets/placements.js has the same text as the fallback).
--
-- Idempotent: the portrait move only touches ¶5 when it has no figure (or
-- already has this one), and the URL rewrite skips a URL already on ?v=2.
-- No BEGIN/COMMIT.

do $$
declare
  chapter_id uuid;
  portraits uuid;
  moved integer;
begin
  select id into chapter_id from public.modules
   where slug = 'foundations-of-neuroscience';
  if chapter_id is null then
    raise notice 'History 13 Oct: no foundations-of-neuroscience module, skipped';
    return;
  end if;

  -- Portraits: after the Descartes box.
  select id into portraits from public.animations
   where animation_key = 'animationFoundationsLocalizationPortraits';
  if portraits is not null then
    update public.paragraphs p
       set animation_id = portraits, has_animation = true,
           animation_trigger = 'auto', updated_at = now()
      from public.sections s
     where p.section_id = s.id and s.module_id = chapter_id
       and s.slug = 'do-different-parts' and p.order_index = 5
       and (p.animation_id is null or p.animation_id = portraits);
    get diagnostics moved = row_count;
    if moved = 1 then
      update public.paragraphs p
         set animation_id = null, has_animation = false, updated_at = now()
        from public.sections s
       where p.section_id = s.id and s.module_id = chapter_id
         and s.slug = 'do-different-parts' and p.order_index = 4
         and p.animation_id = portraits;
    end if;
    raise notice 'History 13 Oct: portraits on ¶5 (% row)', moved;
  end if;

  -- Re-cut images: bust the cache.
  update public.animations
     set image_file_url = image_file_url || '?v=2',
         config = replace(config::text, '.jpg"', '.jpg?v=2"')::jsonb,
         updated_at = now()
   where animation_key in ('animationFoundationsFig1',
                           'animationFoundationsFig16',
                           'animationFoundationsClosingHM')
     and image_file_url not like '%?v=2';

  update public.animations
     set config = jsonb_set(config, '{images,0,alt}',
           '"A preserved human brain seen from the side, on a black surface against a pale grey background."'::jsonb)
   where animation_key = 'animationFoundationsClosingHM';

  -- Widget headings and taglines.
  update public.paragraphs p
     set content = jsonb_set(jsonb_set(p.content,
           '{blocks,0,title}', '"Explore phrenology"'::jsonb),
           '{blocks,0,blurb}',
           '"Click on different parts of the skull to explore Gall and Spurzheim''s model of localization of brain function."'::jsonb),
         updated_at = now()
    from public.sections s
   where p.section_id = s.id and s.module_id = chapter_id
     and p.content->'blocks'->0->>'type' = 'widget'
     and p.content->'blocks'->0->>'widgetId' = 'phrenology';

  update public.paragraphs p
     set content = jsonb_set(jsonb_set(p.content,
           '{blocks,0,title}', '"Be Penfield"'::jsonb),
           '{blocks,0,blurb}',
           '"Explore what having your brain electrically stimulated by Penfield was like."'::jsonb),
         updated_at = now()
    from public.sections s
   where p.section_id = s.id and s.module_id = chapter_id
     and p.content->'blocks'->0->>'type' = 'widget'
     and p.content->'blocks'->0->>'widgetId' = 'case-cabinet';

  raise notice 'History 13 Oct: done';
end $$;
