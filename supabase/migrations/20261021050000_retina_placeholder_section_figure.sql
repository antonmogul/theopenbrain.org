-- OPENBRAIN-148: the "Placeholder" tile at the end of the Retina.
--
-- The 2023 seed gave the Retina's "Looking forward" and "Footnotes"
-- sections the Lottie `animationPlaceholder` (an empty animation titled
-- "Placeholder") as their section figure, to clear the pane. In the
-- Supabase reader it is a listed figure, so a tile that says "Placeholder"
-- sat beside the references. The reader now leaves that key out of its
-- list; this takes it off the sections too, so the data says what the
-- reader does. Any section of any chapter that points at it, and the
-- `{"name": "Placeholder"}` config, are cleared; the animations row stays.
--
-- Idempotent: the update finds the sections or nothing. No BEGIN/COMMIT.

update public.sections s
   set animation_id = null,
       animation_config = case
         when s.animation_config->>'name' = 'Placeholder' then null
         else s.animation_config end,
       updated_at = now()
  from public.animations a
 where a.id = s.animation_id
   and a.animation_key = 'animationPlaceholder';

update public.sections s
   set animation_config = null,
       updated_at = now()
 where s.animation_id is null
   and s.animation_config->>'name' = 'Placeholder';
