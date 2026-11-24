-- Review notes 6b99bd6f and a405e74a (Stuart: slight side scroll on mobile).
-- Stuart withdrew it himself (he was zoomed in); nothing to change.
update public.review_feedback
   set status = 'wont_do',
       reply = 'Closed as you said: the sideways movement came from being zoomed in. The chapter has no sideways scroll on phones at normal zoom (checked at 375 and 390 px).',
       replied_at = now(), updated_at = now()
 where id in ('6b99bd6f-2a2d-43f7-960b-f828a2f602e1', 'a405e74a-f1f4-4035-9d54-4251f28b3039')
   and status = 'new' and reply is null;
