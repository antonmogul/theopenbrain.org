-- OPENBRAIN-109: publish chapter 3, Attention and Working Memory.
--
-- Anton, 28 Sep: take Attention out of draft so the team can click around
-- it (his usual account is a student, which can't see drafts). The text
-- matches the authors' manuscript (OPENBRAIN-108 audit and patch); widgets
-- still to be built show as "not available yet" cards where the designers'
-- review places them. Stress stays a draft. The parked 3 Sep version
-- (attention-and-working-memory-2026-09-03) stays archived.

update public.modules
   set status = 'published',
       updated_at = now()
 where slug = 'attention-and-working-memory'
   and status = 'draft';
