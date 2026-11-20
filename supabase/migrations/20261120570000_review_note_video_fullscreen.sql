-- Review note 889745e8 (Stuart: video fullscreen glitch), fixed by PR #223.
update public.review_feedback
   set status = 'done',
       reply = 'Fixed: going full screen on the Andrew Huxley, Brenda Milner and squid videos no longer restarts the video or jumps the page, with either the book''s expand button or YouTube''s own.',
       replied_at = now(), updated_at = now()
 where id = '889745e8-37df-4e20-b236-e73781947035' and status = 'new' and reply is null;
