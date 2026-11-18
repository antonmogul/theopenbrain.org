-- OPENBRAIN-205: Maura's reworked figure images (18 Nov 2026, "Re: More
-- feedback": "A few images had very tight breathing room, which made the left
-- side feel cramped, so I added more background or masked them").
--
-- Twelve of her thirteen files, as WebP beside the old ones under
-- public/publicAssets/images/foundations/ with a -v2 name (a new name, so
-- the day-long publicAssets cache can't serve the old picture). Four are now
-- cut-outs on transparency for the dark figure pane: Gall & Spurzheim's map
-- (Fig 11), Leborgne's brain (Fig 12), Fritsch & Hitzig's brain (Fig 13) and
-- the trepanned Incan skull (Fig 2, her Foundations_ST7_NM3_LL_02.png).
-- The rest have more room around them: Galen's pig (7), Goltz and Ferrier
-- (14), van Leeuwenhoek's microscope (16), Deiters (17), Cajal's dynamic
-- polarization (20), Burckhardt (box G), Brenda Milner (15, its first image)
-- and the Thurneysser woodcut (the four humours box's Explore picture, a
-- paragraph's content rather than a figure record).
--
-- Not here: her Eccles diagram (Fig 25), redrawn as white lines for the dark
-- pane and named "confirm with S"; it waits for Stuart, and it would vanish
-- on the paper ground figures have below 1024px.
--
-- Each path is replaced only where the exact old path still is, in History's
-- figure records and History's paragraphs: idempotent, and a creator's later
-- choice of picture is left alone. The old files stay, so going back is the
-- same replace the other way. No BEGIN/COMMIT.

-- A path inside JSON, quoted, so fig16-01.jpg never matches fig16-01.jpg?v=2
-- partially and one file name can't match inside another.
do $$
declare
  r record;
  n_anim integer := 0;
  n_para integer := 0;
  c integer;
begin
  for r in select * from (values
  ('/publicAssets/images/foundations/fig01-skull-cutout.webp',
   '/publicAssets/images/foundations/fig01-skull-cutout-v2.webp'),
  ('/publicAssets/images/foundations/fig05-01-pig.jpg',
   '/publicAssets/images/foundations/fig05-01-pig-v2.webp'),
  ('/publicAssets/images/foundations/fig08-01.jpg',
   '/publicAssets/images/foundations/fig08-01-v2.webp'),
  ('/publicAssets/images/foundations/fig09-01.jpg',
   '/publicAssets/images/foundations/fig09-01-v2.webp'),
  ('/publicAssets/images/foundations/fig10-01.jpg',
   '/publicAssets/images/foundations/fig10-01-v2.webp'),
  ('/publicAssets/images/foundations/fig11-01-abc.jpg',
   '/publicAssets/images/foundations/fig11-01-abc-v2.webp'),
  ('/publicAssets/images/foundations/fig12-01.jpg',
   '/publicAssets/images/foundations/fig12-01-v2.webp'),
  ('/publicAssets/images/foundations/fig13-01.jpg',
   '/publicAssets/images/foundations/fig13-01-v2.webp'),
  ('/publicAssets/images/foundations/fig16-01.jpg?v=2',
   '/publicAssets/images/foundations/fig16-01-v2.webp'),
  ('/publicAssets/images/foundations/figg-01.jpg',
   '/publicAssets/images/foundations/figg-01-v2.webp'),
  ('/publicAssets/images/foundations/hm-brenda-milner.jpg',
   '/publicAssets/images/foundations/hm-brenda-milner-v2.webp'),
  ('/publicAssets/images/foundations/thurneysser-four-humours-1574.jpg',
   '/publicAssets/images/foundations/thurneysser-four-humours-1574-v2.webp')
  ) as v(old_src, new_src) loop
    update public.animations
       set config = replace(config::text,
                            to_jsonb(r.old_src)::text,
                            to_jsonb(r.new_src)::text)::jsonb,
           updated_at = now()
     where animation_key like 'animationFoundations%'
       and strpos(config::text, to_jsonb(r.old_src)::text) > 0;
    get diagnostics c = row_count;
    n_anim := n_anim + c;

    update public.paragraphs p
       set content = replace(p.content::text,
                             to_jsonb(r.old_src)::text,
                             to_jsonb(r.new_src)::text)::jsonb,
           updated_at = now()
      from public.sections s
      join public.modules m on m.id = s.module_id
     where p.section_id = s.id
       and m.slug = 'foundations-of-neuroscience'
       and strpos(p.content::text, to_jsonb(r.old_src)::text) > 0;
    get diagnostics c = row_count;
    n_para := n_para + c;
  end loop;
  raise notice 'Maura images: % figure records, % paragraphs', n_anim, n_para;
end $$;
