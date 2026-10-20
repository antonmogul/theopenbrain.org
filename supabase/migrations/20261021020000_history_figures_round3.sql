-- OPENBRAIN-143: Stuart's remaining figure items on the History chapter
-- (foundations-of-neuroscience), 1 and 7 October.
--
-- 1. Fig 5 (7 Oct #6: "just show the bottom half (where galen is dissecting
--    a pig)"): the row now points at fig05-01-pig.jpg, the dissection panel
--    cropped out of the 1565 plate. The full plate stays at fig05-01.jpg.
-- 2. Fig 11 (7 Oct #10: "remove 'Fig 14' 'Fig 15' and 'Fig 17' from the
--    figure itself and replace with text that says Fig A, B, and C. And
--    then update the legend accordingly. And add 'modified from' to the
--    legend"): fig11-01-abc.jpg carries A, B and C where the engraver's
--    numbers were; the caption names them and says "Modified from".
-- 3. Fritsch & Hitzig's Fig 10 and Golgi's lab, Fig 17 (1 Oct #16, 7 Oct
--    #14: "up for like one toggle of a mouse scroll. Maybe add some spacing
--    to text so it stays up for a bit longer"): both are stills, so they
--    already hold until the next figure, but the next figure is the very
--    next paragraph (Fig 11, Fig 18), so a hold could not lengthen them.
--    `animationFlags.room` (screens of reading room below the paragraph in
--    the two-column reader; figureHold.mjs, index.css) does: each gets a
--    full screen, so both are up for over a screen of scroll at 1280 and
--    1440 (half a screen left Fig 10 at 0.9 at 1440). The holds stay
--    Automatic.
--
-- Idempotent: the animations rows are set, not appended to, and the flags
-- merge by key. Rows that aren't there are skipped with a notice. No
-- BEGIN/COMMIT.

do $$
declare
  chapter_id uuid;
  n integer;
begin
  select id into chapter_id from public.modules
   where slug = 'foundations-of-neuroscience';
  if chapter_id is null then
    raise notice 'History figures round 3: no foundations-of-neuroscience module, skipped';
    return;
  end if;

  -- 1. Fig 5: the bottom half of the plate.
  update public.animations
     set image_file_url = '/publicAssets/images/foundations/fig05-01-pig.jpg',
         config = jsonb_set(
           jsonb_set(config, '{images,0,src}',
             to_jsonb('/publicAssets/images/foundations/fig05-01-pig.jpg'::text)),
           '{images,0,alt}',
           to_jsonb('A woodcut of Galen dissecting a pig on a table before a crowd of onlookers.'::text)),
         updated_at = now()
   where animation_key = 'animationFoundationsFig5'
     and jsonb_typeof(config->'images') = 'array';
  get diagnostics n = row_count;
  raise notice 'History figures round 3: Fig 5 cropped (% row)', n;

  -- 2. Fig 11: A, B, C on the plate and in the legend; "Modified from".
  update public.animations
     set image_file_url = '/publicAssets/images/foundations/fig11-01-abc.jpg',
         config = jsonb_set(
           jsonb_set(
             jsonb_set(config, '{images,0,src}',
               to_jsonb('/publicAssets/images/foundations/fig11-01-abc.jpg'::text)),
             '{images,0,alt}',
             to_jsonb('Drawings of Goltz''s dog brain (A and B) and Ferrier''s monkey brain (C) after lesions.'::text)),
           '{caption}',
           to_jsonb('Anatomical drawings of Goltz’s dog (left, A and B) and Ferrier’s monkey (right, C) that were presented at the Seventh International Medical Congress in 1881. Modified from Gowers WR, Klein E, Schaefer AE, Langley JN. Preliminary report. Transactions of the International Medical Congress 1881. Volume 1.'::text)),
         updated_at = now()
   where animation_key = 'animationFoundationsFig11'
     and jsonb_typeof(config->'images') = 'array';
  get diagnostics n = row_count;
  raise notice 'History figures round 3: Fig 11 relabelled (% row)', n;

  -- 3. Reading room below Fig 10's and Fig 17's paragraphs.
  update public.paragraphs p
     set content = jsonb_set(coalesce(p.content, '{}'::jsonb), '{animationFlags}',
           coalesce(p.content->'animationFlags', '{}'::jsonb)
             || jsonb_build_object('room', r.room)),
         updated_at = now()
    from public.sections s, public.animations a,
         (values ('do-different-parts', 'animationFoundationsFig10', 1),
                 ('basic-functional-unit', 'animationFoundationsFig17', 1)
         ) as r(section_slug, animation_key, room)
   where p.section_id = s.id and s.module_id = chapter_id
     and s.slug = r.section_slug
     and a.id = p.animation_id and a.animation_key = r.animation_key;
  get diagnostics n = row_count;
  raise notice 'History figures round 3: reading room on Fig 10 and Fig 17 (% rows)', n;
end $$;
