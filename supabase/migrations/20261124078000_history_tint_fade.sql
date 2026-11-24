-- OPENBRAIN-80: the chapter-colour wash on History's photographs in the
-- figure pane (Maura's sketch of 23 Nov, idea 2). A figure asks for it with
-- config.tintFade = true (src/helper/figureTint.js): from 1024px its plain
-- stills open as a duotone in the chapter colour and clear to the natural
-- picture as the reader scrolls through the figure's window.
--
-- Photographs only: the brain of H.M., Brenda Milner and H.M., Leborgne's
-- brain, Van Leeuwenhoek's microscope, Golgi's lab and the first picture of
-- a chemical synapse. Line art, galleries of engravings, widgets and box
-- figures are left alone, and inside a flagged figure the reader skips
-- video posters by itself (Maura's are already violet).
--
-- Deploy the reader first or after, either works: a reader without the code
-- ignores the key, and the code without the key shows no wash.
-- Guarded on the key alone, so a replay changes nothing and every other
-- config key is kept. Revert: config = config - 'tintFade' on these keys.
update public.animations
set config = coalesce(config, '{}'::jsonb) || '{"tintFade": true}'::jsonb,
    updated_at = now()
where animation_key in (
    'animationFoundationsClosingHM',
    'animationFoundationsMilnerHM',
    'animationFoundationsFig9',
    'animationFoundationsFig12',
    'animationFoundationsFig17',
    'animationFoundationsFig18'
  )
  and (config->'tintFade') is distinct from 'true'::jsonb;
