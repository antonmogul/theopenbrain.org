-- OPENBRAIN-200: the Rita Levi-Montalcini video opens the NGF box (Stuart,
-- 17 Nov 2026: "the only one that still looks odd on PC is 'The Developing
-- Brain' one, where the first thing you see is text and then a blank space
-- to the right. You could maybe insert the video of Rita Levi-Montalcini
-- there").
--
-- The box reads sideways (helper/exploreRail.js): its first part was ¶1
-- (Cajal's growth cones) with no figure, so the track opened on text and
-- an empty right side; the video (animationFoundationsNgfLeviMontalcini,
-- Figure L, migration 20261011000000) started the second part, on ¶2. The
-- figure moves to ¶1, so the first part is the video and then ¶1 and ¶2
-- run together after it (railLayoutOf: a paragraph without a figure joins
-- the part before it). The portraits (Figure M) stay on ¶3. Figure letters
-- do not change: L is still the box's first figure.
--
-- Idempotent and guarded: changes the two rows only while ¶2 still holds
-- the video and ¶1 holds no figure, so a creator's later choice is left
-- alone and a second run changes nothing. No BEGIN/COMMIT.
--
-- To go back: set ¶2's animation_id to the video's id (trigger 'auto',
-- has_animation true) and ¶1's to null (trigger null, has_animation false).

do $$
declare
  chapter_id uuid;
  box_id uuid;
  video_id uuid;
  p1 uuid;
  p2 uuid;
  affected integer;
begin
  select id into chapter_id from public.modules
   where slug = 'foundations-of-neuroscience';
  if chapter_id is null then
    raise notice 'NGF video: no foundations-of-neuroscience module, skipped';
    return;
  end if;

  select id into box_id from public.sections
   where module_id = chapter_id and slug = 'box-ngf';
  select id into video_id from public.animations
   where animation_key = 'animationFoundationsNgfLeviMontalcini';
  if box_id is null or video_id is null then
    raise notice 'NGF video: box (%) or video (%) missing, skipped', box_id, video_id;
    return;
  end if;

  select id into p1 from public.paragraphs
   where section_id = box_id and order_index = 1 and animation_id is null;
  select id into p2 from public.paragraphs
   where section_id = box_id and order_index = 2 and animation_id = video_id;
  if p1 is null or p2 is null then
    raise notice 'NGF video: not as on 17 Nov (¶1 free: %, ¶2 with the video: %), skipped', p1, p2;
    return;
  end if;

  update public.paragraphs
     set animation_id = null, animation_trigger = null, has_animation = false
   where id = p2;
  update public.paragraphs
     set animation_id = video_id, animation_trigger = 'auto', has_animation = true
   where id = p1;
  get diagnostics affected = row_count;
  raise notice 'NGF video: moved to the box''s first paragraph (% row)', affected;
end $$;
