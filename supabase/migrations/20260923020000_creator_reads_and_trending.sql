-- Let the dashboards read the numbers they show, and stop public highlights
-- failing to save (OPENBRAIN-55).
--
-- 1. quiz_attempts had one policy, "Students manage own quiz attempts", so the
--    creator console always showed 0 attempts (3 exist) and the professor
--    views could not see their students' results. Adds read-only policies:
--    creators read every attempt; professors read attempts by students
--    enrolled in one of their courses. Writes stay student-only.
--
-- 2. trending_highlights has RLS on and no policies (initial schema), and is
--    filled by the AFTER INSERT trigger on highlights WHEN is_public, whose
--    function ran as the reader. So saving a new *public* highlight raised an
--    RLS error and the highlight was lost, and nobody could read the table.
--    The trigger function becomes SECURITY DEFINER with a pinned
--    search_path (callable only as a trigger), and the table becomes
--    readable: it only ever holds text from highlights their authors made
--    public.

-- 1. Quiz attempts: read access for the people who grade them
DROP POLICY IF EXISTS "Creators read quiz attempts" ON quiz_attempts;
CREATE POLICY "Creators read quiz attempts"
  ON quiz_attempts FOR SELECT TO authenticated
  USING (public.is_creator());

DROP POLICY IF EXISTS "Professors read their students' quiz attempts" ON quiz_attempts;
CREATE POLICY "Professors read their students' quiz attempts"
  ON quiz_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM course_enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE c.professor_id = auth.uid()
        AND e.student_id = quiz_attempts.student_id
    )
  );

-- 2. Trending highlights
ALTER FUNCTION public.update_trending_highlights() SECURITY DEFINER;
ALTER FUNCTION public.update_trending_highlights() SET search_path = public;
-- Trigger functions don't need EXECUTE at fire time; this only stops the
-- function being called directly over /rest/v1/rpc.
REVOKE EXECUTE ON FUNCTION public.update_trending_highlights() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone reads trending highlights" ON trending_highlights;
CREATE POLICY "Anyone reads trending highlights"
  ON trending_highlights FOR SELECT TO anon, authenticated
  USING (true);

-- Self-check
DO $$
BEGIN
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.update_trending_highlights'::regproc) THEN
    RAISE EXCEPTION 'creator reads: update_trending_highlights is not SECURITY DEFINER';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.quiz_attempts'::regclass
      AND polname = 'Creators read quiz attempts'
      AND polcmd = 'r'
  ) THEN
    RAISE EXCEPTION 'creator reads: quiz_attempts read policy missing';
  END IF;
  -- No new write access anywhere: every added policy is SELECT-only.
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid IN ('public.quiz_attempts'::regclass, 'public.trending_highlights'::regclass)
      AND polname IN (
        'Creators read quiz attempts',
        'Professors read their students'' quiz attempts',
        'Anyone reads trending highlights'
      )
      AND polcmd <> 'r'
  ) THEN
    RAISE EXCEPTION 'creator reads: a new policy grants more than SELECT';
  END IF;
END $$;
