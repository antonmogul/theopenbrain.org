-- Maura's late notes of 25 Nov, fixed by #265 (top bar) and #266 (opener wash, papyrus card).
-- fcf3b612 was reopened by her follow-up 74e732c2 and keeps an older reply, so it is guarded on its status only.

update public.review_feedback
   set status = 'done',
       reply = 'Done: the whole picture box now starts in the chapter purple (a white ground with the purple multiplied over it), and as you scroll the purple and the white fade out together, leaving the skull on the dark background without it moving or changing size. The same happens in Closing words. The purple stops at the caption row; it can run to the bottom of the pane if you prefer.',
       replied_at = now(), updated_at = now()
 where id = '74e732c2-37da-4b43-a75f-a870278a7f18'
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Done: the whole picture box now starts in the chapter purple (a white ground with the purple multiplied over it), and as you scroll the purple and the white fade out together, leaving the skull on the dark background without it moving or changing size. The same happens in Closing words. The purple stops at the caption row; it can run to the bottom of the pane if you prefer.',
       replied_at = now(), updated_at = now()
 where id = 'fcf3b612-bc0d-4d13-8cb3-181da110546e'
   and status = 'new';

update public.review_feedback
   set status = 'done',
       reply = 'The Fig 05 card back now has the same padding on both sides (21px), and in full screen the text is set larger so the padding stays even there too.',
       replied_at = now(), updated_at = now()
 where id = '90b32ea1-7cd3-4c31-8c8c-097a9fe6ba2f'
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The top bar is now #131313.',
       replied_at = now(), updated_at = now()
 where id = '393f2d5f-74ec-4c80-bbc6-073deba90921'
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The bar is a little taller, with 6px more room above and below its buttons; jumps in the chapter still land just under it.',
       replied_at = now(), updated_at = now()
 where id = 'ef821430-a81a-4e80-8a7a-763f66f81f4e'
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'The book-and-brain mark, search, home and close icons now share one visual line weight, with the brain drawn a little heavier so it doesn''t read thinner than the rest.',
       replied_at = now(), updated_at = now()
 where id = '8c023d57-e441-4581-92a1-247ebcdef1cc'
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Pointing at the search icon now opens a white search line out of it, with the words sliding in from the left; it closes again when you move away unless you are typing.',
       replied_at = now(), updated_at = now()
 where id = '957808cd-0b48-4a2d-93e0-52fda4e122aa'
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'done',
       reply = 'Hovering TOOLS now opens the row from right to left one item after another, and it folds back the same way when you move away.',
       replied_at = now(), updated_at = now()
 where id = '479b6f53-e71d-498a-b107-77db853a03fa'
   and status = 'new' and reply is null;

update public.review_feedback
   set status = 'question',
       reply = 'We''ve prepared a shorter voice list (the four best voices on each device: e.g. Samantha, Daniel, Karen and the Google voices) and will switch it on once Anton approves it.',
       replied_at = now(), updated_at = now()
 where id = 'd62a283f-285f-43ed-97ee-f5ded7f9e4ef'
   and status = 'new' and reply is null;
