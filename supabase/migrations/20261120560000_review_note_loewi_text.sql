-- Review note c96ff4ae (Stuart: Loewi text too small on a MacBook), fixed by
-- PR #221 (Loewi v5). Only while still 'new' with no reply.
update public.review_feedback
   set status = 'done',
       reply = 'The Loewi animation''s headings, captions and timeline are now larger on your MacBook screen size (the top heading went from about 5px to 13px).',
       replied_at = now(), updated_at = now()
 where id = 'c96ff4ae-e628-452c-883d-d04c6a206130' and status = 'new' and reply is null;
