-- Review notes of 25 Nov (Maura, Stuart), fixed by PRs #251-#255 (OPENBRAIN-81..85).
-- Guarded: only notes still new with no reply change.

update public.review_feedback
   set status = 'done',
       reply = 'Thanks, found it: on a wide screen each of those Retina pictures was drawn twice, once oversized inside the paragraph and again as the numbered figure below. Each now appears once, with its figure number and caption.',
       replied_at = now(), updated_at = now()
 where id in ('d8bd5c02-0e77-4bf1-a964-d83b74b6afc1')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The film now fills the whole left side on Fig 06, from the top bar down to the figure title with no gap at the top or sides, and the crop is anchored just above the two heads so they stay in frame from a small laptop to a very wide screen; on a phone and in the full-screen view you still see the whole film.',
       replied_at = now(), updated_at = now()
 where id in ('9adb1524-5b8e-414d-b8e9-6e27fc2d3f46')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The chapter you are reading now has a small arrow at the right of its row in the contents drawer: press it to fold that chapter''s sections away and see just the list of chapters, and press it again to bring them back. The drawer still opens with them showing each time.',
       replied_at = now(), updated_at = now()
 where id in ('f9408373-d8b1-469c-b66a-92039d1d4f8e')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The shadow along the bottom of the cover is gone. It was the blur the cover gets as you scroll, fading the picture''s edge into the dark behind it; the cover now stays clean to its edge on every chapter.',
       replied_at = now(), updated_at = now()
 where id in ('7681ad12-e747-4cf8-857f-7c8a1d4df1b1')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Pictures in the figure pane now keep 24px clear at each side, so the papyrus no longer touches the pane''s edges and lines up with the card of Fig 05 that follows it.',
       replied_at = now(), updated_at = now()
 where id in ('15d2252e-60dc-401d-aae6-a214198a8e94')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The back of the cards is now the chapter colour at full strength (#8D4CF6 in History) with white text, 4.67:1; the "Translation" label is white too, because the pale violet could not be read on it.',
       replied_at = now(), updated_at = now()
 where id in ('532a5d59-a356-4cbf-9f93-b72d390da1de')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Figure names in the breakout boxes now sit under the picture, as on the half-and-half screen, in all seven boxes and on phones; the expand button is on the same row.',
       replied_at = now(), updated_at = now()
 where id in ('cda4302b-b0ee-4976-b135-a9bde91b6512')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The skull now stays in the same place and at the same size as you scroll from Where is my mind? into its first figure; only the violet wash clears.',
       replied_at = now(), updated_at = now()
 where id in ('fcf3b612-bc0d-4d13-8cb3-181da110546e')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The repeated section title and large number have been removed from the left-hand cards; the heading stays on the right.',
       replied_at = now(), updated_at = now()
 where id in ('6a1494d5-8ddb-48ab-92ea-7713fcf952e7')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'question',
       reply = 'Agreed. This one is with Maura: she will check the original phrenology drawing and redraw areas 23 and 25 so the two hemispheres match. We will swap the new artwork in when it arrives.',
       replied_at = now(), updated_at = now()
 where id in ('00f8379c-2281-4acd-9019-cf90feb4e6bb')
   and status = 'new' and reply is null;
