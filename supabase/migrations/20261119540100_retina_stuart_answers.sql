-- OPENBRAIN-54: Stuart's three answers, 19 Nov 2026.
-- Pending. Deploy the reader and local media before applying this migration.
-- Sources: old /chapter/break/baden -> assets/BreakView.3c3df943.js ->
-- /publicAssets/video/breakSections/baden.mp4 (323.625 s, 87,490,348 bytes).
-- Re-encoded locally as publicAssets/videos/baden.mp4 (H.264/AAC, faststart).
-- Retinal development: Stuart's attached 15-retinal-development.mp4, encoded
-- by scripts/figures/encode-figure-loop.sh (960 x 960, silent, 14 s + poster).
-- Placement and caption keys only: preserve the rewritten prose/citations,
-- unrelated flags/config, later author choices, and all review_feedback rows.

update public.animations
   set config = jsonb_set(config, '{caption}', to_jsonb($caption$Current-voltage relationship from the outer segment of an isolated salamander rod. Voltage was held at the dark level and current was measured 20 ms after switching to the new light level. Curve 1 – dark. Curve 2 – half-saturating light. Curve 3 – Saturating light. Adapted from Baylor and Nunn (1986).$caption$::text)),
       updated_at = now()
 where animation_key = 'animationRetinaCountingPhotons'
   and config ->> 'caption' = 'Current through cGMP-gated channels at different membrane potentials.';

-- One placement: hold through Signal and noise and Signal amplification,
-- stopping at the next figure/band/section under the existing timing rules.
update public.paragraphs p
   set content = jsonb_set(p.content, '{animationFlags}',
         coalesce(p.content -> 'animationFlags', '{}'::jsonb) || '{"hold":"next"}'::jsonb),
       updated_at = now()
  from public.sections s, public.modules m, public.animations a
 where p.id = 'bced1220-5563-4751-995d-5ddd31acc061'
   and p.section_id = s.id and s.module_id = m.id and m.slug = 'the-retina'
   and p.animation_id = a.id and a.animation_key = 'animationRetinaCountingPhotons'
   and not (coalesce(p.content -> 'animationFlags', '{}'::jsonb) ? 'hold');

-- The Baden break already follows Blind spot (order 4). Fill only its missing
-- slug, retaining the text block, title, ordering and any other block metadata.
update public.paragraphs p
   set content = jsonb_set(p.content, '{blocks}', (
         select jsonb_agg(
           case when b ->> 'type' = 'break_video' and b ->> 'title' = 'Tom Baden'
                     and b ->> 'videoSlug' is null
                then jsonb_set(b, '{videoSlug}', '"baden"') else b end order by n)
           from jsonb_array_elements(p.content -> 'blocks') with ordinality as x(b, n))),
       updated_at = now()
  from public.sections s, public.modules m
 where p.id = 'f8fbd23b-3204-4fa4-b355-ea250b659430'
   and p.section_id = s.id and s.module_id = m.id and m.slug = 'the-retina'
   and exists (select 1 from jsonb_array_elements(p.content -> 'blocks') b
                where b ->> 'type' = 'break_video' and b ->> 'title' = 'Tom Baden'
                  and b ->> 'videoSlug' is null);

insert into public.animations
  (animation_key, title, media_type, image_file_url, interaction_type, component_name, config)
select 'animationRetinaDevelopment', 'Retinal development', 'image',
       '/publicAssets/videos/retina/retinal-development-loop.webp', 'static_image', 'IllustrationComp',
       $j${"placeholder":true,"caption":"Neuroblasts divide and migrate as the developing retina generates its neuronal layers and assembles retinal circuits.","images":[{"src":"/publicAssets/videos/retina/retinal-development-loop.webp","alt":"Animation of neuronal development in the retina.","loop":{"mp4":"/publicAssets/videos/retina/retinal-development-loop.mp4","webm":"/publicAssets/videos/retina/retinal-development-loop.webm","width":960,"height":960}}]}$j$::jsonb
 where exists (
   select 1 from public.paragraphs p
   join public.sections s on p.section_id = s.id
   join public.modules m on s.module_id = m.id
   where p.id = 'f96d99ae-0771-4784-8949-d73788bb9c90' and m.slug = 'the-retina'
     and p.animation_id is null and p.has_animation = false and p.animation_trigger is null)
on conflict (animation_key) do nothing;

update public.paragraphs p
   set animation_id = a.id, has_animation = true,
       animation_trigger = 'animationRetinaDevelopment', updated_at = now()
  from public.animations a, public.sections s, public.modules m
 where p.id = 'f96d99ae-0771-4784-8949-d73788bb9c90'
   and p.section_id = s.id and s.module_id = m.id and m.slug = 'the-retina'
   and p.animation_id is null and p.has_animation = false and p.animation_trigger is null
   and a.animation_key = 'animationRetinaDevelopment'
   and a.config #>> '{images,0,src}' = '/publicAssets/videos/retina/retinal-development-loop.webp'
   and a.config #> '{images,0,loop}' = '{"mp4":"/publicAssets/videos/retina/retinal-development-loop.mp4","webm":"/publicAssets/videos/retina/retinal-development-loop.webm","width":960,"height":960}'::jsonb;
