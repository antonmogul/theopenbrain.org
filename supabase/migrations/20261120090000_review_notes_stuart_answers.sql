-- The three review notes that were questions for Stuart, answered in his
-- email of 19 Nov and fixed by PR #219 (OPENBRAIN-54). Now 'done' with the
-- reply the reviewer sees. Guarded: only while still 'question'.
update public.review_feedback as r
   set status = 'done', reply = v.reply, replied_at = now(), updated_at = now()
  from (values
    ('a213369d-c51a-45f3-9d00-ecc6099a359b'::uuid,
     'Thanks: the current–voltage chart now stays in the figure pane beside Counting photons, Signal and noise and Signal amplification, with your caption as its legend.'),
    ('0728f249-4ee0-45e8-9d1d-685902d96eb1'::uuid,
     'Thanks for the link: Tom Baden''s original video is back, right after Blind spot, in the same player as the other interview videos.'),
    ('73de308d-1b97-41e0-b71b-69fac78e6b9f'::uuid,
     'Thanks: your retinal-development animation now loops silently beside Generation and wiring of retinal neurons, with a short legend (a still image when animations are off).')
  ) as v(id, reply)
 where r.id = v.id and r.status = 'question';
