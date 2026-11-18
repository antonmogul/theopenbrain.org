-- OPENBRAIN-201: Plato and Aristotle (Fig 6) becomes Maura's short loop, 18 Nov 2026.
--
-- Maura sent the animation of the figure (OB_hist_platovs.-aristotle.mp4: the
-- brain and the heart in the two philosophers' hands pulse, 1.7 s). It takes the
-- still's place in the same slot, where-is-my-mind ¶7, with the same legend
-- and alt; nothing else about the figure moves. Encoded for the web by
-- scripts/figures/encode-figure-loop.sh into public/publicAssets/video/foundations/:
-- plato-aristotle-loop.webm (VP9) and .mp4 (H.264), 960 × 1280, no sound,
-- and plato-aristotle-loop.webp, the first frame: the poster, the thumbnail
-- and the still under reduced motion. FigureImages plays `loop` muted,
-- looping and inline over `src` (helper/figureCycle.js figureLoop).
--
-- Push only once production serves the three files and the reader build that
-- knows `loop` (the PR's deploy): an older build shows the poster as a still,
-- which is also fine.
--
-- Guarded: the row changes only while its first image is still the old still
-- (an author's later edit is left alone); a second run is a no-op.
-- No BEGIN/COMMIT.
--
-- To go back:
--   update public.animations
--      set image_file_url = '/publicAssets/images/foundations/plato-aristotle.webp',
--          config = jsonb_set(config, '{images,0}',
--            (config->'images'->0 - 'loop')
--            || '{"src": "/publicAssets/images/foundations/plato-aristotle.webp"}')
--    where animation_key = 'animationFoundationsPlatoAristotle';

do $$
declare
  affected integer;
begin
  update public.animations
     set image_file_url = '/publicAssets/video/foundations/plato-aristotle-loop.webp',
         config = jsonb_set(
           config, '{images,0}',
           (config->'images'->0) || $j${
             "src": "/publicAssets/video/foundations/plato-aristotle-loop.webp",
             "loop": {
               "webm": "/publicAssets/video/foundations/plato-aristotle-loop.webm",
               "mp4": "/publicAssets/video/foundations/plato-aristotle-loop.mp4",
               "width": 960,
               "height": 1280
             }
           }$j$::jsonb),
         updated_at = now()
   where animation_key = 'animationFoundationsPlatoAristotle'
     and config->'images'->0->>'src' = '/publicAssets/images/foundations/plato-aristotle.webp';
  get diagnostics affected = row_count;
  raise notice 'Plato and Aristotle loop: % row', affected;
end
$$;
