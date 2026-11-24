-- Review note c96ff4ae (Stuart: Loewi text too small) was reopened by his
-- follow-up 0fcb7e95 and kept its 20 Nov reply, so 20261124079000 skipped it.
-- Loewi v6 (PR #238) fixed it; only while still 'new' with that old reply.
update public.review_feedback
   set status = 'done',
       reply = 'The four tubes are now named in a colour key just under the animation, and the names over Loewi''s record are drawn at normal reading size (about 12px on your MacBook, up from 5px); the closing Vagusstoff and acetylcholine labels are larger too.',
       replied_at = now(), updated_at = now()
 where id = 'c96ff4ae-e628-452c-883d-d04c6a206130' and status = 'new'
   and reply like 'The Loewi animation''s headings, captions and timeline are now larger%';
