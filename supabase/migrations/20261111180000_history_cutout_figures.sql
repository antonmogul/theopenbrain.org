-- OPENBRAIN-180: the designers' final figure assets for History (Figma
-- Yv7WvZSoabK2t5fNtsChvf, section "Final assets"), 11 Nov 2026.
--
--   Fig 1, the trepanned Incan skull: the engraving cut out of its page
--     (2880:100419), so it sits on the dark figure pane without a white card.
--   Fig 3, the Edwin Smith papyrus: the sheet cut out of its photograph's
--     black surround (2885:3301).
--   Plato and Aristotle (2880:99131), new: Raphael's two philosophers holding
--     a brain and a heart. Stuart asked for it on 8 Oct (item 2 of his email;
--     20261009000000 left it "for Sonia and Maura to design"). It hangs on
--     where-is-my-mind ¶7, where Plato's view is told, and as a still it
--     holds through Aristotle's paragraph after it (OPENBRAIN-131). It has no
--     figureNumber, so it reads "FIG" and the manuscript's numbering stands.
--     Its legend is ours until the authors write theirs.
--
-- The new files have new names (public/publicAssets/images/foundations/), so
-- no browser shows a cached copy of the old one under the new URL; the old
-- JPEGs stay in the repo for the fixture's history and a way back.
--
-- Idempotent: a figure's image is swapped only while it still shows the old
-- file (an author's later upload is left alone); the new row upserts by
-- animation_key and attaches only to a paragraph that has no figure, or
-- already has this one. No BEGIN/COMMIT.
--
-- To go back: set the two URLs to fig01-01.jpg?v=2 / fig03-01.jpg, and
--   update public.paragraphs set animation_id = null, has_animation = false
--    where animation_id = (select id from public.animations
--                           where animation_key = 'animationFoundationsPlatoAristotle');

do $$
declare
  chapter_id uuid;
  swap record;
  figure_id uuid;
  affected integer;
begin
  select id into chapter_id from public.modules
   where slug = 'foundations-of-neuroscience';
  if chapter_id is null then
    raise notice 'History cut-outs: no foundations-of-neuroscience module, skipped';
    return;
  end if;

  -- 1. Fig 1 and Fig 3: the cut-out files.
  for swap in
    select * from (values
      ('animationFoundationsFig1',
       '/publicAssets/images/foundations/fig01-01.jpg?v=2',
       '/publicAssets/images/foundations/fig01-skull-cutout.webp'),
      ('animationFoundationsFig3',
       '/publicAssets/images/foundations/fig03-01.jpg',
       '/publicAssets/images/foundations/fig03-papyrus-cutout.webp')
    ) as t(animation_key, old_src, new_src)
  loop
    update public.animations a
       set image_file_url = swap.new_src,
           config = jsonb_set(a.config, '{images,0,src}', to_jsonb(swap.new_src)),
           updated_at = now()
     where a.animation_key = swap.animation_key
       and a.image_file_url = swap.old_src
       and a.config->'images'->0->>'src' = swap.old_src;
    get diagnostics affected = row_count;
    raise notice 'History cut-outs: % (% row)', swap.animation_key, affected;
  end loop;

  -- 2. Plato and Aristotle.
  insert into public.animations
    (animation_key, title, media_type, interaction_type, component_name,
     image_file_url, config, scientific_domain, load_priority)
  values (
    'animationFoundationsPlatoAristotle', 'Plato and Aristotle',
    'image', 'static_image', 'IllustrationPlaceholder',
    '/publicAssets/images/foundations/plato-aristotle.webp',
    $j${
      "caption": "Plato and his pupil Aristotle, after Raphael's The School of Athens (1509–1511). Plato, who placed the mind in the head, holds a brain; Aristotle, who placed it in the heart, holds a heart.",
      "images": [
        {"src": "/publicAssets/images/foundations/plato-aristotle.webp",
         "alt": "Two robed philosophers walk side by side under an arch. Plato, older and white-bearded, in red and purple, holds up a brain; Aristotle, in blue and brown, holds a heart in his open hand."}
      ],
      "placeholder": true,
      "diagramType": "illustration"
    }$j$::jsonb,
    'history', 'low')
  on conflict (animation_key) do update
    set title = excluded.title,
        image_file_url = excluded.image_file_url,
        config = excluded.config,
        updated_at = now()
  returning id into figure_id;

  update public.paragraphs p
     set animation_id = figure_id, has_animation = true,
         animation_trigger = 'auto', updated_at = now()
    from public.sections s
   where p.section_id = s.id and s.module_id = chapter_id
     and s.slug = 'where-is-my-mind'
     and p.order_index = 7
     and (p.animation_id is null or p.animation_id = figure_id);
  get diagnostics affected = row_count;
  raise notice 'History cut-outs: Plato and Aristotle on where-is-my-mind/7 (% paragraph)', affected;
end $$;
