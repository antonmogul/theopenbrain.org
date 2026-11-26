-- Maura's notes on the cover logo (#269) and box parallax and motion (#270).

update public.review_feedback
   set status = 'done', reply = 'Every chapter now starts with the full book logo in the top-left corner, at the size of the old Retina cover: dark ink on History''s pale cover and white on the others. As you scroll, the words fade and the book shrinks into the mark in the top bar.', replied_at = now(), updated_at = now()
 where id = 'aff3fd2d-1840-4002-8807-3db30aaaa059' and status = 'new';

update public.review_feedback
   set status = 'done', reply = 'Hippocrates now opens with your layered painting moving in depth as you scroll, and every side-scrolling box can have its own layers: in the chapter editor each box has a Title card section where you can upload layers and set their depth. Phones and reduced motion show the flat picture.', replied_at = now(), updated_at = now()
 where id = '8170ef5d-4c67-4e39-8b05-889c543aea2f' and status = 'new';

update public.review_feedback
   set status = 'done', reply = 'Inside the boxes, the title picture, the words and the sideways sections now follow the scroll with a gentle delay and short pauses between steps (picture, then text, then the slide), while the page itself and every jump keep their exact positions.', replied_at = now(), updated_at = now()
 where id = '26684c7c-bc7d-4130-bd79-41dbace1f608' and status = 'new';
