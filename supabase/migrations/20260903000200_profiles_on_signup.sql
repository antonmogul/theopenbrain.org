-- OPENBRAIN-27: give every new auth user a profiles row.
--
-- Self-signup (AuthForm → useAuth.signUp → POST /auth/v1/signup) created an
-- auth.users row and nothing else: no trigger, no client-side insert, and no
-- INSERT policy on profiles. A self-registered reader therefore had no role,
-- so the role-gated /student route was unreachable (and, since OPENBRAIN-25,
-- the guard fails closed to /chapters?auth=role-unavailable).
--
-- The role is ALWAYS 'student' here. It is deliberately not read from the
-- signup metadata, which any caller of /auth/v1/signup can set; professor
-- and creator roles are granted by an administrator:
--   UPDATE profiles SET role = 'professor' WHERE email = 'someone@univ.edu';
--
-- Idempotent: CREATE OR REPLACE / DROP IF EXISTS, ON CONFLICT DO NOTHING,
-- and a backfill for auth users that already exist without a profile.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), ''),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: existing accounts that signed up before the trigger existed.
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  COALESCE(u.email, ''),
  NULLIF(TRIM(COALESCE(u.raw_user_meta_data ->> 'full_name', '')), ''),
  'student'
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_missing INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_missing
  FROM auth.users AS u
  LEFT JOIN public.profiles AS p ON p.id = u.id
  WHERE p.id IS NULL;
  RAISE NOTICE 'profiles_on_signup: trigger installed; auth users without a profile: %', v_missing;
END
$$;
