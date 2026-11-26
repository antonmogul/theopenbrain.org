-- Maura's History style notes of 25 Nov, fixed by PRs #257-#262 (OPENBRAIN-86..91).
-- Guarded: only notes still new with no reply change.

update public.review_feedback
   set status = 'done',
       reply = 'Clicking anywhere on the beige map page now puts the archive pieces back in their place under the map; dragging and opening them still works.',
       replied_at = now(), updated_at = now()
 where id in ('94359ad1-0922-4299-85a0-47de7c224c20')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The paperclip now sits lower against the note''s edge, so it looks clipped on rather than floating.',
       replied_at = now(), updated_at = now()
 where id in ('45aadb17-8fd8-4ccc-ba76-f85bc2368937')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The tabs now stay tucked behind the cover all the way through closing, with no jump.',
       replied_at = now(), updated_at = now()
 where id in ('cf0bcb16-ff72-47f3-ab06-2d9f9db8761c')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'There is now 20px more room between the explanatory text and the binder.',
       replied_at = now(), updated_at = now()
 where id in ('b96c2f6d-76e0-40eb-bbbd-63e0bfc78ff9')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The ripples are gone: the selected point now has a larger, solid dot with a larger bold number.',
       replied_at = now(), updated_at = now()
 where id in ('d594819b-1a86-4dcc-9ca1-9ac7027e4778')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The Loewi figure now fills the whole left side, from the top bar down to the figure title and edge to edge, with no margin around it.',
       replied_at = now(), updated_at = now()
 where id in ('5e0bd444-1388-4e3b-8547-d548f0498971')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'There is now twice the space between the row of solution names and the stage name below it.',
       replied_at = now(), updated_at = now()
 where id in ('bd0342b1-612a-4c95-86a1-4caa48f53029')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The colour squares are now the height of the capital letters and sit on the same line, so they are centred with their labels.',
       replied_at = now(), updated_at = now()
 where id in ('b841869e-4093-4738-8088-b7e969baebc4')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The colour dot in the top left is now centred on its label.',
       replied_at = now(), updated_at = now()
 where id in ('a62d9d78-7eb9-401c-b007-2e7276581fb4')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The top-left label, the names above the recording and the legend below it now share one size (13px), weight and letter spacing.',
       replied_at = now(), updated_at = now()
 where id in ('d43da1be-29af-4376-9566-18dc5e26d4db')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Clicking anywhere on the picture, the legend or the caption now pauses or plays the animation; the timeline and the buttons keep their own jobs.',
       replied_at = now(), updated_at = now()
 where id in ('7a47cfd4-70d6-4629-98b3-0bed56e654e7')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The text beside the skull now fades into the dark background at its bottom edge while there is more to scroll, and the fade goes when you reach the end (open organ 29, Language, to see it).',
       replied_at = now(), updated_at = now()
 where id in ('d7a0e029-0865-4557-a663-3e4b24a3c7d9')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The full-screen icon under the skull is now the same four-corner icon as the figures on the left, in the same amber, and the Penfield binder''s uses it too.',
       replied_at = now(), updated_at = now()
 where id in ('a6b8fca6-ebbd-4849-ac3d-63fedd7fa378')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The caption under the skull is now only as wide as the skull and starts at its left edge.',
       replied_at = now(), updated_at = now()
 where id in ('e5798d6b-cd46-49f0-affa-e84a92b47647')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The funding banner is light grey with no purple line, the Neuro logo sits on the left with no white box behind it, and the text is on the right in the same type as the names. If you still see a white box around the logo, refresh once: browsers keep the old picture for up to a day.',
       replied_at = now(), updated_at = now()
 where id in ('2aacb023-e164-40f3-92cd-d108a6b2dd38')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Yes: the reference links and the small citation numbers in the text are now the chapter''s purple instead of pink, which is also slightly easier to read on white.',
       replied_at = now(), updated_at = now()
 where id in ('2242f830-48f4-4222-bf6a-b17b04e24667')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The purple line before the section name in the timeline''s hover card is gone.',
       replied_at = now(), updated_at = now()
 where id in ('148ec02b-825f-4f61-a15a-4844969c56d9')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The ripple and the line that shot into the picture are gone: the round marker now grows a little (20px to 24px, in a fifth of a second with a slight bounce) as it fills with colour when its figure appears, and stays that size while the figure is showing. I couldn''t open your sketch, so tell me if you meant something different, such as a quick pop that returns to its normal size.',
       replied_at = now(), updated_at = now()
 where id in ('0dfcb1b6-c4e2-40d3-a519-1edb9d32b83d')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The purple overlay is gone from Fig 12, and the side padding is already live: pictures keep 24px from the pane''s edges since yesterday evening''s update.',
       replied_at = now(), updated_at = now()
 where id in ('af567627-505f-4d14-b3c7-dde1f2b191e7')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Done: Fig 15 shows without the purple overlay, which now appears only on section openers.',
       replied_at = now(), updated_at = now()
 where id in ('c6856246-c0bf-49e0-b622-dd221bddb661')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Done: Figs 21 and 22 show their photographs without the purple overlay.',
       replied_at = now(), updated_at = now()
 where id in ('a6871b4a-b7ec-4f1b-a388-6b6dc8313393')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Done: the overlay clears as you scroll only in "Where is my mind?" and Closing words, where the section''s picture is the figure that follows; Fig 16 and the rest have none.',
       replied_at = now(), updated_at = now()
 where id in ('c25316f5-8393-44f6-911a-ebc7ce089d62')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Your new picture is in: coming into Closing words it fills the left side in violet, then clears into the photograph without moving, full width with no top margin and the brain centred (Fig 26).',
       replied_at = now(), updated_at = now()
 where id in ('0ca2e51d-57ac-4190-8050-dbb6571ca971')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Done: figures now sit on #272727, in the left pane and in the full-screen view, while breakout boxes stay on #1C1C1C.',
       replied_at = now(), updated_at = now()
 where id in ('1be69ccc-35c8-4958-a75a-eabcacc4f61b')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Already done in yesterday evening''s update (#255): Fig 11 keeps 24px of padding on each side of the pane; tell us if you would like more than that.',
       replied_at = now(), updated_at = now()
 where id in ('ba921617-90db-4aca-bdf3-5abe9ce6846e')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The microscope now fills the whole left side, from the top bar down to the figure title, and at your window size nothing of it is lost; on wider, shorter screens (for example 1280 × 720 or 1920 × 1080) the foot of the instrument is cut off, so if you can add background on the left and right (about 4:3 landscape) it will stay whole everywhere.',
       replied_at = now(), updated_at = now()
 where id in ('b20eb65d-2b14-4543-92d0-66cf7e46324f')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Deiters'' cells now fill the whole left side and fit your window almost exactly, but because the drawing runs to all four edges, wider screens trim the top branches of cells 1 and 2, so this is the one that would need more paper on all four sides (about 15% each).',
       replied_at = now(), updated_at = now()
 where id in ('dd806bf8-0bd2-421e-951c-597e6144a780')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The thumbnails under every gallery now fill their boxes, so they are all the same size with even gaps, and the main image is unchanged.',
       replied_at = now(), updated_at = now()
 where id in ('dfd767ea-ab9d-4cdc-951f-1ebbfefc70db')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Video thumbnails now fill their frame, and Brenda Milner''s keeps her whole face and both rats; the one that gets too cropped is Andrew Huxley''s (Fig 25), where the top of his head is trimmed and the frame stops at his chin, so a wider picture with more room around his head would help.',
       replied_at = now(), updated_at = now()
 where id in ('44e3024f-34b3-43de-88e6-0f752f18e1bb')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Rita Levi-Montalcini''s thumbnail now fills its frame with her face whole (only the bottom is cropped), so no new size is needed.',
       replied_at = now(), updated_at = now()
 where id in ('55370796-0e4e-4b5c-9aca-5f3e41e50acd')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Every play button on the page is now one style, a white square with a dark triangle and the same padding at every size (video thumbnails, gallery thumbnails and the gallery''s own play and pause); the two buttons in the Loewi figure already had this style, so they are unchanged.',
       replied_at = now(), updated_at = now()
 where id in ('06404d14-bffb-4540-a8b2-ae450cf974ef')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The Vesalius figure now moves up with the text as the Descartes box arrives, and returns smoothly when you scroll back.',
       replied_at = now(), updated_at = now()
 where id in ('97f9f6f8-678b-42b7-b4b1-586a1163c3cf')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Each Descartes skull image now has its figure number, name and full-screen control together below the picture.',
       replied_at = now(), updated_at = now()
 where id in ('8ccacb3e-902c-419a-b8c1-6127468f5e6c')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Box pictures now keep their name, number, full-screen control and a folded legend with credit details together underneath, including galleries and phone pages.',
       replied_at = now(), updated_at = now()
 where id in ('54839079-0b59-45be-a6ee-99263a67c64c')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The electrical-stimulation box now uses the same text-column width as the Descartes box and the other side-scrolling boxes.',
       replied_at = now(), updated_at = now()
 where id in ('f660e77f-d00e-45b5-88c1-b0ebdc094fb5')
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Penfield''s Skip button now uses the book''s shared button component.',
       replied_at = now(), updated_at = now()
 where id in ('a8fa1bc4-701d-4f5f-90b7-7d26077aefea')
   and status = 'new' and reply is null;
