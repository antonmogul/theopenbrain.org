-- OPENBRAIN-86: the chapter-colour wash comes off History's figures, and
-- Closing words gets Maura's new picture of the brain of H.M.
--
-- Maura, 25 Nov 2026 (review notes af567627, c6856246, a6871b4a, c25316f5):
-- "Can we remove the purple overlay? That treatment is only for new section
-- openers." "Color overlay being removed as you scroll only makes sense when
-- the image of the section is the [same] as the one that comes right after,
-- for example where is my mind and conclusions." And 0ca2e51d: "I replaced
-- the image so it has more padding around it, especially on top. You can use
-- the same image for the section cover and for the left side, full width and
-- without the top margin."
--
-- DEPLOY THE READER FIRST. Parts 2 and 3 point at two files that ship with
-- it (hm-brain-v3.webp and sections/closing-words-v2.webp, both made by
-- scripts/figures/make-closing-words-art.py on one pixel grid); pushed
-- before the deploy, Fig 26 and the Closing words cover would be missing
-- pictures. Part 1 alone has no such order. The reader works before this is
-- pushed: it shows the wash and the old picture as it does today.
--
-- No BEGIN/COMMIT. Each statement is guarded on the keys it changes, keeps
-- every other key, and changes nothing on a replay.

-- 1. The wash off: the six figures 20261124078000_history_tint_fade flagged.
--    The reader's code stays (src/helper/figureTint.js); no record asks.
update public.animations
set config = config - 'tintFade',
    updated_at = now()
where animation_key in (
    'animationFoundationsClosingHM',
    'animationFoundationsMilnerHM',
    'animationFoundationsFig9',
    'animationFoundationsFig12',
    'animationFoundationsFig17',
    'animationFoundationsFig18'
  )
  and config ? 'tintFade';

-- 2. Fig 26, the brain of H.M.: the new picture, filling the pane
--    (config.fill, OPENBRAIN-84; the brain is at the frame's centre, so no
--    focal point is stored and the default 50% 50% applies, while one an
--    author sets later is kept). `wash` on the picture names the same frame
--    in the chapter's violet: the section's cover, which the pane fades
--    into the photograph as the reader comes into the section
--    (sectionCardFigure in src/helper/sectionCard.js).
--    Only while the row still shows the picture this replaces.
update public.animations
set config = jsonb_set(
      config,
      '{images,0}',
      (config->'images'->0) || jsonb_build_object(
        'src', '/publicAssets/images/foundations/hm-brain-v3.webp',
        'wash', '/publicAssets/images/foundations/sections/closing-words-v2.webp'
      )
    ) || '{"fill": true}'::jsonb,
    image_file_url = '/publicAssets/images/foundations/hm-brain-v3.webp',
    updated_at = now()
where animation_key = 'animationFoundationsClosingHM'
  and config->'images'->0->>'src' in (
    '/publicAssets/images/foundations/hm-brain.jpg?v=2',
    '/publicAssets/images/foundations/hm-brain.jpg'
  );

-- 3. The Closing words cover (the contents' picture and the section card):
--    the same frame. Only while the section still has the cover it was
--    seeded with (20261120066301); alt and any other key are kept.
update public.sections s
set art = s.art || jsonb_build_object(
      'src', '/publicAssets/images/foundations/sections/closing-words-v2.webp'
    )
from public.modules m
where m.id = s.module_id
  and m.slug = 'foundations-of-neuroscience'
  and s.slug = 'closing-words'
  and s.art->>'src' = '/publicAssets/images/foundations/sections/closing-words.webp';

-- To go back:
--   update public.animations
--      set config = jsonb_set(config, '{images,0}',
--            ((config->'images'->0) - 'wash') || '{"src": "/publicAssets/images/foundations/hm-brain.jpg?v=2"}'::jsonb) - 'fill',
--          image_file_url = '/publicAssets/images/foundations/hm-brain.jpg?v=2'
--    where animation_key = 'animationFoundationsClosingHM';
--   update public.sections s set art = s.art || '{"src": "/publicAssets/images/foundations/sections/closing-words.webp"}'::jsonb
--     from public.modules m where m.id = s.module_id
--      and m.slug = 'foundations-of-neuroscience' and s.slug = 'closing-words';
--   and replay 20261124078000_history_tint_fade for the wash.
