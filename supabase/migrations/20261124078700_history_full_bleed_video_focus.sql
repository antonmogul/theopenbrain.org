-- OPENBRAIN-87: Fig 16 and Fig 17 fill the figure pane, and the three video
-- posters get a focal point.
--
-- Maura, 25 Nov 2026:
--   b20eb65d (Fig 16, Van Leeuwenhoek's microscope) and dd806bf8 (Fig 17,
--     Deiters' nerve cells): "Can we make this image full bleed? Let me know
--     if it gets too cropped and you need me to extend the background even
--     more."
--   44e3024f (Fig 15, Brenda Milner and H.M.) and 55370796 (Fig L, Rita
--     Levi-Montalcini): "Video thumbnails should be set to fill the whole
--     container, even if they get cropped, as long as no faces get cut off".
--
-- 1. The two pictures. A figure asks to fill the pane on its row (figureFill
--    in src/helper/figureCycle.js, OPENBRAIN-84):
--      config.fill  = true     from 1024px the picture covers the whole pane
--                              above the FIG row, edge to edge from under the
--                              top bar (object-fit: cover);
--      config.focus = "x% y%"  the focal point (across, down) the crop keeps.
--    Fig 16 (1440 x 1920) keeps "50% 30%": the lens, the specimen pin and the
--    focusing screw. Fig 17 (1440 x 1821) keeps "60% 70%": the four cell
--    bodies. Both are upright pictures, so a pane as tall as it is wide or
--    wider (a 1280 x 720 laptop, a 1920 x 1080 monitor) cuts the foot of the
--    microscope and the outer branches of the cells; Maura has offered wider
--    pictures. The text column below 1024px and the fullscreen dialog still
--    show the whole picture.
--
-- 2. The posters. A video's poster now fills its 16:9 frame (VideoEmbed),
--    cropped around the item's own focal point, `focus` on the entry of
--    config.images that carries the video:
--      Fig 15, Brenda Milner (g4-6A8u8QBc)        "50% 30%"  her face and both rats
--      Fig L, Rita Levi-Montalcini (WgkAR-vrJpM)  "50% 0%"   from the top of her hair
--      Fig 25, Andrew Huxley (KbA3RLz3xUQ)        "50% 60%"  eyes, mouth and chin
--    The same point places the picture in its gallery thumbnail.
--
-- Deploy the reader first or after, either works: a reader without the code
-- ignores every key here, and the code without them shows the two pictures
-- whole and crops the posters around their centre.
-- Guarded on the keys alone: `fill` is set while it is not true; a `focus`
-- only where the row, or the video's entry, has none (one an author sets
-- later is kept); every other key and every other entry is kept in place; a
-- replay changes nothing. No BEGIN/COMMIT.
--
-- To go back:
--   update public.animations set config = config - 'fill' - 'focus'
--    where animation_key in ('animationFoundationsFig12', 'animationFoundationsFig13');
--   update public.animations set config = jsonb_set(config, '{images}', (
--       select jsonb_agg(case when jsonb_typeof(e.item) = 'object'
--                             then e.item - 'focus' else e.item end order by e.ord)
--       from jsonb_array_elements(config->'images') with ordinality as e(item, ord)))
--    where animation_key in ('animationFoundationsMilnerHM',
--      'animationFoundationsNgfLeviMontalcini', 'animationFoundationsFig21');
update public.animations as a
set config = coalesce(a.config, '{}'::jsonb)
      || '{"fill": true}'::jsonb
      || case
           when coalesce(a.config, '{}'::jsonb) ? 'focus' then '{}'::jsonb
           else jsonb_build_object('focus', v.focus)
         end,
    updated_at = now()
from (values
  ('animationFoundationsFig12', '50% 30%'),
  ('animationFoundationsFig13', '60% 70%')
) as v(animation_key, focus)
where a.animation_key = v.animation_key
  and (
    (a.config->'fill') is distinct from 'true'::jsonb
    or not (coalesce(a.config, '{}'::jsonb) ? 'focus')
  );

update public.animations as a
set config = jsonb_set(
      a.config,
      '{images}',
      (
        select jsonb_agg(
                 case
                   when jsonb_typeof(e.item) = 'object'
                        and e.item->>'youtube' = v.youtube
                        and not (e.item ? 'focus')
                     then e.item || jsonb_build_object('focus', v.focus)
                   else e.item
                 end
                 order by e.ord
               )
        from jsonb_array_elements(a.config->'images') with ordinality as e(item, ord)
      )
    ),
    updated_at = now()
from (values
  ('animationFoundationsMilnerHM', 'g4-6A8u8QBc', '50% 30%'),
  ('animationFoundationsNgfLeviMontalcini', 'WgkAR-vrJpM', '50% 0%'),
  ('animationFoundationsFig21', 'KbA3RLz3xUQ', '50% 60%')
) as v(animation_key, youtube, focus)
where a.animation_key = v.animation_key
  and jsonb_typeof(a.config->'images') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(a.config->'images') as i(item)
    where jsonb_typeof(i.item) = 'object'
      and i.item->>'youtube' = v.youtube
      and not (i.item ? 'focus')
  );
