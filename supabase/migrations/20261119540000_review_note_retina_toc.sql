-- Review note be3ef6b0 (Stuart, Retina contents): fixed by PR #217 (OPENBRAIN-53).
-- Same guard as 20261119530000: only while still 'new' with no reply.
update public.review_feedback
   set status = 'done',
       reply = 'The chapter title now stays on the left as you scroll through the Retina''s contents on desktop; the phone layout stays stacked.',
       replied_at = now(), updated_at = now()
 where id = 'be3ef6b0-68ee-44f7-bc51-a5c991bd00a4'
   and status = 'new' and reply is null;
