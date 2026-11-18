-- OPENBRAIN-44: Maura's 18 Nov History video posters; Stuart's picks are
-- still pending confirmation. Deploy the WebPs and corner-control code first.
-- The supplied Andrew/Brenda/Rita JPGs have NO baked-in play icon (only the
-- reference sheet does), so posterPlay=corner asks the book for exactly one
-- unobstructive control. The reference sheet is deliberately not shipped.
--
-- Revert by swapping these exact new src values back to the old ones below,
-- removing posterPlay only where it is still "corner"; keep all other keys:
-- animationFoundationsNgfLeviMontalcini / WgkAR-vrJpM:
--   /publicAssets/images/foundations/thumbs/rita-levi-montalcini.webp
--   -> https://i.ytimg.com/vi/WgkAR-vrJpM/hqdefault.jpg
-- animationFoundationsMilnerHM / g4-6A8u8QBc:
--   /publicAssets/images/foundations/thumbs/brenda-milner.webp
--   -> https://i.ytimg.com/vi/g4-6A8u8QBc/hqdefault.jpg
-- animationFoundationsFig21 / KbA3RLz3xUQ (Andrew Huxley interview):
--   /publicAssets/images/foundations/thumbs/andrew-huxley.webp
--   -> https://i.ytimg.com/vi/KbA3RLz3xUQ/hqdefault.jpg
-- Original videos, start times, captions, ordering and all stills are kept.
with targets(animation_key, youtube, old_src, new_src) as (
  values
    ('animationFoundationsNgfLeviMontalcini', 'WgkAR-vrJpM',
     'https://i.ytimg.com/vi/WgkAR-vrJpM/hqdefault.jpg',
     '/publicAssets/images/foundations/thumbs/rita-levi-montalcini.webp'),
    ('animationFoundationsMilnerHM', 'g4-6A8u8QBc',
     'https://i.ytimg.com/vi/g4-6A8u8QBc/hqdefault.jpg',
     '/publicAssets/images/foundations/thumbs/brenda-milner.webp'),
    ('animationFoundationsFig21', 'KbA3RLz3xUQ',
     'https://i.ytimg.com/vi/KbA3RLz3xUQ/hqdefault.jpg',
     '/publicAssets/images/foundations/thumbs/andrew-huxley.webp')
), patches as (
  select a.id, jsonb_agg(
    case when i.item->>'youtube' = t.youtube
           and i.item->>'src' = t.old_src
           and i.item->>'play' = 'player'
           and not (i.item ? 'posterPlay')
      then i.item || jsonb_build_object('src', t.new_src, 'posterPlay', 'corner')
      else i.item end order by i.ord
  ) as images
  from public.animations a
  join targets t using (animation_key)
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(a.config->'images') = 'array'
      then a.config->'images' else '[]'::jsonb end
  ) with ordinality as i(item, ord)
  group by a.id
)
update public.animations a
set config = jsonb_set(a.config, '{images}', p.images), updated_at = now()
from patches p
where a.id = p.id and a.config->'images' is distinct from p.images;
