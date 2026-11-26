-- Review note c22a8444 (Maura: Fig 06 video looks static). Her browser was
-- asking for reduced motion when she wrote it (the note's anchor records it),
-- and the book shows a still frame instead of looping films then. No change.
update public.review_feedback
   set status = 'done',
       reply = 'The film still plays: your browser was set to reduce motion when you left this note, and the book then shows a still frame instead of looping films. To see it move, press "?" in the top bar and set Motion to On (or turn off "Reduce motion" in your computer''s accessibility settings).',
       replied_at = now(), updated_at = now()
 where id = (select id from public.review_feedback where id::text like 'c22a8444%' limit 1)
   and status = 'new' and reply is null;
