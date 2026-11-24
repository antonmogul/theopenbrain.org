-- Stuart's 20-23 Nov review notes, fixed by PRs #237-#243 (OPENBRAIN-70..76).
-- Each note is marked done with a reply; d1de73dc (phrenology 23/25) is a question back to him.
-- Guarded: only notes still new with no reply change.
update public.review_feedback
   set status = 'done',
       reply = 'The arrow for a figure that follows a breakout box now sits lower on the midline, where the figure really appears, so it turns purple as it meets the dot instead of well after passing it. Look at Figures 6, 10, 12, 14 and 20.',
       replied_at = now(), updated_at = now()
 where id in ('2476d96f-d9ad-4e7c-98cc-f6fbf1c9a543', '59b9ec77-9f08-47a6-bcc2-ceb0bfab514b', '052b09f0-6ff8-42b6-8c8b-5be34d24107e', '8b3d8413-0b23-430b-b478-a08165b10a4e', 'b441bbec-0c73-4424-b3d8-a4357733b416')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The four tubes are now named in a colour key just under the animation, and the names over Loewi''s record are drawn at normal reading size (about 12px on your MacBook, up from 5px); the closing Vagusstoff and acetylcholine labels are larger too.',
       replied_at = now(), updated_at = now()
 where id in ('c96ff4ae-e628-452c-883d-d04c6a206130', '0fcb7e95-9c2d-444d-b67e-b18b87c35d77')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'question',
       reply = 'You''re right, and it''s in the drawing rather than the code: on the front view, 23 and 25 on the right run down over the brow into the eye socket, while on the left they stop at the brow (23 is about twice the area on the right). Should both stop at the brow, as on the left? We''ll ask Maura to redraw once you confirm.',
       replied_at = now(), updated_at = now()
 where id in ('d1de73dc-f6c6-4421-9d58-d6a062a26ca3')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'On a phone the timeline''s dashes are now four times thicker (4px, were about 1px) and the dots 7px, on a slightly taller strip; tapping it still opens the full chapter scrubber.',
       replied_at = now(), updated_at = now()
 where id in ('81d64603-f6d5-46db-aeb9-c04595b92c4e')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Same change in the Retina: the dots and dashes at the bottom of the phone screen are now large enough to read at a glance.',
       replied_at = now(), updated_at = now()
 where id in ('daf6525a-ce35-4057-8d37-2eeb9622d7df')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'We think the line was the page showing through just under the timeline while Safari''s toolbar slid in or out. The timeline''s colour now carries on below its edge so nothing can show there. We couldn''t reproduce it without a real iPhone, so please scroll through the NGF box again and tell us if you still see it.',
       replied_at = now(), updated_at = now()
 where id in ('477527fa-5da4-4fce-9122-e5e1c133b6ed')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Fixed: the retinal cell types figure now stays put as the Lateral organization full-screen figure scrolls away, instead of disappearing and popping back. Scroll past that figure in Organization and cell types to see it.',
       replied_at = now(), updated_at = now()
 where id in ('e963ca3d-606d-4cd0-a352-43b81b61a304')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'On a phone the photoreceptor part names are now bordered buttons under a ''Tap a part to highlight it'' line, and the one you pick fills in (Fig 07).',
       replied_at = now(), updated_at = now()
 where id in ('c9ead1a5-3aa0-4c62-bfd9-9413603cbda0')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'On a phone the phototransduction legend is smaller and the caption and step rows tighter, so the animation is about twice as tall and the legend is no longer cut off at the bottom.',
       replied_at = now(), updated_at = now()
 where id in ('00e8111a-2d7b-492a-8e7f-bef6271c8ad7')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'On a phone the ON and OFF bipolar cells animation now takes about half the frame instead of a quarter (Fig 11), and more again in full screen.',
       replied_at = now(), updated_at = now()
 where id in ('66a8d2de-a67c-47d2-9a39-4249dd70eefa')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The names under the eye in Fig 02 are now buttons with a ''Tap a name to highlight it'' line, and the one showing is filled in.',
       replied_at = now(), updated_at = now()
 where id in ('20a3a87b-062a-4dda-97f8-5062e3302589')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'On a phone ''accommodation'' and ''vergence'' are now plain words in the text, and Fig 03 has its own Accommodation and Vergence buttons under the animation; desktop is as before.',
       replied_at = now(), updated_at = now()
 where id in ('d59fb8d5-066b-4a97-adc1-30aeae4f042a')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The rod and cone drawing and the absorption spectra in Photoreceptors now fit the phone screen; tap Legend under a picture for its caption.',
       replied_at = now(), updated_at = now()
 where id in ('9ed788a3-d964-4d29-9dbd-d14f5b583e9b')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The picture above Fig 10 in Bipolar cells is no longer cut off on the right.',
       replied_at = now(), updated_at = now()
 where id in ('01734735-da9b-40bc-9e03-6dc4352a453d')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The bipolar cell responses chart now shows all of its traces and labels, with its caption under Legend.',
       replied_at = now(), updated_at = now()
 where id in ('0d937d90-0977-4c58-ae02-9f0cc6f23c6a')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The starburst amacrine figure in Circuit computations now shows all four DS cells; its caption wraps under Legend.',
       replied_at = now(), updated_at = now()
 where id in ('ed5741cc-ace7-4c9b-8bf6-bb375679d1ce')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The retina-to-brain projections figure in Retinal output is no longer cropped.',
       replied_at = now(), updated_at = now()
 where id in ('43ea169c-5639-4a03-a0f7-23e38be92659')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The light adaptation curves now fit the screen, with the caption under Legend.',
       replied_at = now(), updated_at = now()
 where id in ('7cbb9ca2-836b-4365-af31-5cede9c6cced')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The disease figures (Fig 21–26) now fill the width of the phone instead of sitting as small circles.',
       replied_at = now(), updated_at = now()
 where id in ('be7b1aaa-1648-4865-b1dd-9dca0b2ff8b7')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'In Fig 05 (Lateral organization) the caption now sits in its own strip under the two pictures instead of over the lower one.',
       replied_at = now(), updated_at = now()
 where id in ('84804f84-b945-4f7c-9981-9689b9fca830')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The book now remembers the paragraph you are reading and brings it back to the same spot on the screen when you turn the phone or resize the window, so rotating back and forth leaves you where you were.',
       replied_at = now(), updated_at = now()
 where id in ('0fe38cc6-74c9-4f8d-8107-3c2d9a53f7d4')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'On a phone the contents now loads only the one picture it shows instead of seven large ones stacked behind each other, which is what made it flicker as you scrolled; please check it on your iPhone, since we could not reproduce the flicker off a real device.',
       replied_at = now(), updated_at = now()
 where id in ('72b0e654-8b18-4456-9225-cfac1255090d')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Each side-scrolling box now fits on one phone screen, with the heading, the picture or text, and the Explore more / Keep going buttons all visible at once, so you only move sideways.',
       replied_at = now(), updated_at = now()
 where id in ('32276578-3c01-422b-83fe-e4fba6a2f3f2')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The vision-loss videos at the end of the Retina chapter now play inside the page on a phone instead of opening the full-screen player; please confirm on your iPhone.',
       replied_at = now(), updated_at = now()
 where id in ('6bbbce8d-eb25-4532-b12c-3fc8d45c7e36')
   and status = 'new' and reply is null;
