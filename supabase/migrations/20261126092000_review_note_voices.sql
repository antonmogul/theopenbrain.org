-- Review note d62a283f (Maura: smaller voice library in Listen), approved by
-- Anton on 26 Nov and shipped in #268.
update public.review_feedback
   set status = 'done',
       reply = 'Done: Listen now offers a short list of four voices, the best ones your device has (for example Samantha, Daniel and Karen on a Mac, or the Google voices in Chrome).',
       replied_at = now(), updated_at = now()
 where id = (select id from public.review_feedback where id::text like 'd62a283f%' limit 1)
   and status = 'question';
