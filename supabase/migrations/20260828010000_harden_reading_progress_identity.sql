-- Make one reading_progress row the durable identity for each
-- user/module/course tuple, including standalone chapters where course_id is
-- NULL. This migration is intentionally transactional: unsupported PostgreSQL
-- versions or constraint failures leave the existing table unchanged.

BEGIN;

LOCK TABLE reading_progress IN SHARE ROW EXCLUSIVE MODE;

-- Keep the most recently accessed row as the canonical reading position while
-- preserving sticky completion and the greatest cumulative time from any
-- duplicate. Time is cumulative, so summing snapshots would over-count it.
CREATE TEMP TABLE reading_progress_duplicate_groups ON COMMIT DROP AS
SELECT
  user_id,
  module_id,
  course_id,
  (ARRAY_AGG(
    id
    ORDER BY last_accessed_at DESC NULLS LAST,
             created_at DESC NULLS LAST,
             id DESC
  ))[1] AS keep_id,
  MAX(COALESCE(time_spent_seconds, 0)) AS max_time_spent_seconds,
  BOOL_OR(COALESCE(is_completed, FALSE)) AS was_completed,
  MIN(completed_at) FILTER (WHERE completed_at IS NOT NULL) AS first_completed_at,
  MAX(last_accessed_at) AS latest_accessed_at
FROM reading_progress
GROUP BY user_id, module_id, course_id
HAVING COUNT(*) > 1;

UPDATE reading_progress AS progress
SET
  time_spent_seconds = duplicates.max_time_spent_seconds,
  is_completed = duplicates.was_completed,
  completed_at = CASE
    WHEN duplicates.was_completed THEN
      COALESCE(duplicates.first_completed_at, progress.completed_at, NOW())
    ELSE NULL
  END,
  last_accessed_at = COALESCE(
    duplicates.latest_accessed_at,
    progress.last_accessed_at
  )
FROM reading_progress_duplicate_groups AS duplicates
WHERE progress.id = duplicates.keep_id;

DELETE FROM reading_progress AS progress
USING reading_progress_duplicate_groups AS duplicates
WHERE progress.user_id = duplicates.user_id
  AND progress.module_id = duplicates.module_id
  AND progress.course_id IS NOT DISTINCT FROM duplicates.course_id
  AND progress.id <> duplicates.keep_id;

ALTER TABLE reading_progress
  DROP CONSTRAINT IF EXISTS reading_progress_user_id_module_id_course_id_key;

-- NULLS NOT DISTINCT makes a standalone NULL course_id participate in the
-- same logical key, so PostgREST's explicit on_conflict column target works
-- for both enrolled-course and standalone reading.
ALTER TABLE reading_progress
  ADD CONSTRAINT reading_progress_user_id_module_id_course_id_key
  UNIQUE NULLS NOT DISTINCT (user_id, module_id, course_id);

-- Completion is monotonic. Protect it at the database boundary as well as in
-- the client so an older tab or legacy writer cannot reopen a finished module.
CREATE OR REPLACE FUNCTION preserve_reading_progress_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_completed IS TRUE AND NEW.is_completed IS NOT TRUE THEN
    NEW.is_completed := TRUE;
    NEW.completed_at := OLD.completed_at;
  ELSIF NEW.is_completed IS TRUE AND NEW.completed_at IS NULL THEN
    NEW.completed_at := COALESCE(OLD.completed_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reading_progress_preserve_completion
  ON reading_progress;
CREATE TRIGGER reading_progress_preserve_completion
BEFORE UPDATE ON reading_progress
FOR EACH ROW
EXECUTE FUNCTION preserve_reading_progress_completion();

COMMIT;
