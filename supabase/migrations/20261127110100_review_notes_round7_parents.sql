-- Maura's four notes reopened by her 26 Nov follow-ups (d0df3145, a9074d50, 4099cac4,
-- c901ae53), all fixed in #276. Close the parents with the follow-up's outcome.
update public.review_feedback p
   set status = 'done', reply = c.reply, replied_at = now(), updated_at = now()
  from public.review_feedback c
 where c.parent_id = p.id and c.status = 'done' and p.status = 'new'
   and p.id::text similar to '(af567627|54839079|45aadb17|5e0bd444)%';
