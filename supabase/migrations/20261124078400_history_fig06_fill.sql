-- OPENBRAIN-84: Plato and Aristotle (History Fig 06) fills the figure pane.
--
-- Maura, 25 Nov 2026 (review note 9adb1524): "Can we make the video fill the
-- whole left side? That means removing the padding at the top and sides, so
-- it goes from the nav bar to the figure title. Could we set the focal point
-- on the heads so they don't get cropped on different screen sizes?"
--
-- A figure asks for it on its row (figureFill in src/helper/figureCycle.js):
--   config.fill  = true       from 1024px its one picture or film covers the
--                             whole pane above the FIG row, edge to edge
--                             from under the top bar (object-fit: cover);
--   config.focus = "50% 15%"  the focal point (across, down) the crop keeps:
--                             just above the two heads in the 960 × 1280
--                             film, so hair, faces, the brain and the heart
--                             stay in frame from a 4:3 laptop to an
--                             ultra-wide screen.
-- The text column below 1024px and the fullscreen dialog still show the whole
-- film.
--
-- Deploy the reader first or after, either works: a reader without the code
-- ignores both keys, and the code without them shows the figure as before.
-- Guarded on the two keys alone: `fill` is set while it is not true, `focus`
-- only while the row has none (a focal point an author sets later is kept),
-- every other config key is kept, and a replay changes nothing.
-- No BEGIN/COMMIT.
--
-- To go back:
--   update public.animations set config = config - 'fill' - 'focus'
--    where animation_key = 'animationFoundationsPlatoAristotle';
update public.animations
set config = coalesce(config, '{}'::jsonb)
      || '{"fill": true}'::jsonb
      || case
           when coalesce(config, '{}'::jsonb) ? 'focus' then '{}'::jsonb
           else '{"focus": "50% 15%"}'::jsonb
         end,
    updated_at = now()
where animation_key = 'animationFoundationsPlatoAristotle'
  and (
    (config->'fill') is distinct from 'true'::jsonb
    or not (coalesce(config, '{}'::jsonb) ? 'focus')
  );
