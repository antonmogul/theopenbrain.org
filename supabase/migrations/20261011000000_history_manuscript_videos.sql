-- OPENBRAIN-136: the videos Stuart asked for in his comments on the History
-- manuscript (Foundations_ST7_NM3_LL.docx). They were Word comments, not
-- body text, so the import never brought them in.
--
--   #16 "Link to history of neuro video for brenda"        → the Milner/H.M.
--       gallery (do-different-parts ¶18), after her portrait.
--   #20/#21 "breakout box about Rita Levi Montalcini … and include this
--       video" (t=2s)                                        → a new figure on
--       the NGF box's Levi-Montalcini paragraph (box-ngf ¶2).
--   #22 "add link to these 2 videos" (the action-potential paragraph,
--       how-neurons-communicate ¶1, Figure 19)               → the squid giant
--       axon film there. Its other video, the Huxley interview, is…
--   #23 "add link to this video" ("Alan Hodgkin and Andrew Huxley", ¶9,
--       Figure 21)                                           → …placed here,
--       once, at its most specific anchor.
--
-- Each is a gallery video item (FigureImages): `play: "player"` is an
-- ordinary player the reader starts, with sound; `src` is YouTube's still,
-- which the reader's CSP allows (img-src i.ytimg.com). Idempotent: an item is
-- added only when its figure doesn't already hold that video, and the new
-- figure attaches only to a paragraph without one. No BEGIN/COMMIT.

do $$
declare
  chapter_id uuid;
  figure_id uuid;
  v jsonb;
begin
  select id into chapter_id from public.modules
   where slug = 'foundations-of-neuroscience';
  if chapter_id is null then
    raise notice 'History videos: no foundations-of-neuroscience module, skipped';
    return;
  end if;

  -- Figure 19: the squid and its giant nerve fibre (The Physiological Society)
  v := jsonb_build_object(
    'src', 'https://i.ytimg.com/vi/ZSCUbYyrHug/hqdefault.jpg',
    'youtube', 'ZSCUbYyrHug', 'play', 'player',
    'alt', 'Video: The squid and its giant nerve fibre, Part 2.',
    'caption', 'The squid and its giant nerve fibre, Part 2. Film: The Physiological Society.');
  update public.animations
     set config = jsonb_set(config, '{images}', coalesce(config->'images', '[]'::jsonb) || jsonb_build_array(v)),
         updated_at = now()
   where animation_key = 'animationFoundationsFig19'
     and not coalesce(config->'images', '[]'::jsonb) @> '[{"youtube": "ZSCUbYyrHug"}]';

  -- Figure 21: Andrew Huxley interviewed by Alan Macfarlane
  v := jsonb_build_object(
    'src', 'https://i.ytimg.com/vi/KbA3RLz3xUQ/hqdefault.jpg',
    'youtube', 'KbA3RLz3xUQ', 'play', 'player',
    'alt', 'Video: an interview with Andrew Huxley.',
    'caption', 'Andrew Huxley interviewed by Alan Macfarlane. Video: Alan Macfarlane.');
  update public.animations
     set config = jsonb_set(config, '{images}', coalesce(config->'images', '[]'::jsonb) || jsonb_build_array(v)),
         updated_at = now()
   where animation_key = 'animationFoundationsFig21'
     and not coalesce(config->'images', '[]'::jsonb) @> '[{"youtube": "KbA3RLz3xUQ"}]';

  -- Milner/H.M. gallery: the SfN film, right after Brenda Milner's portrait
  v := jsonb_build_object(
    'src', 'https://i.ytimg.com/vi/g4-6A8u8QBc/hqdefault.jpg',
    'youtube', 'g4-6A8u8QBc', 'play', 'player',
    'alt', 'Video: History of Neuroscience, Brenda Milner.',
    'caption', 'History of Neuroscience: Brenda Milner. Video: Society for Neuroscience.');
  update public.animations
     set config = jsonb_set(config, '{images}',
           jsonb_build_array(config->'images'->0) || jsonb_build_array(v) || ((config->'images') - 0)),
         updated_at = now()
   where animation_key = 'animationFoundationsMilnerHM'
     and jsonb_array_length(coalesce(config->'images', '[]'::jsonb)) > 0
     and not (config->'images') @> '[{"youtube": "g4-6A8u8QBc"}]';

  -- The NGF box: Rita Levi-Montalcini (SfN), from 0:02 as Stuart linked it
  insert into public.animations
    (animation_key, title, media_type, interaction_type, component_name,
     image_file_url, config, scientific_domain, load_priority)
  values (
    'animationFoundationsNgfLeviMontalcini',
    'History of Neuroscience: Rita Levi-Montalcini',
    'image', 'static_image', 'IllustrationPlaceholder',
    'https://i.ytimg.com/vi/WgkAR-vrJpM/hqdefault.jpg',
    jsonb_build_object(
      'placeholder', true, 'diagramType', 'video',
      'caption', 'History of Neuroscience: Rita Levi-Montalcini. Video: Society for Neuroscience.',
      'images', jsonb_build_array(jsonb_build_object(
        'src', 'https://i.ytimg.com/vi/WgkAR-vrJpM/hqdefault.jpg',
        'youtube', 'WgkAR-vrJpM', 'play', 'player', 'start', 2,
        'alt', 'Video: History of Neuroscience, Rita Levi-Montalcini.'))),
    'history', 'low')
  on conflict (animation_key) do update
    set title = excluded.title, image_file_url = excluded.image_file_url,
        config = excluded.config, updated_at = now()
  returning id into figure_id;

  update public.paragraphs p
     set animation_id = figure_id, has_animation = true,
         animation_trigger = 'auto', updated_at = now()
    from public.sections s
   where p.section_id = s.id and s.module_id = chapter_id
     and s.slug = 'box-ngf' and p.order_index = 2
     and (p.animation_id is null or p.animation_id = figure_id);

  raise notice 'History videos: done';
end $$;
