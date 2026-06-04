-- Profile fields for the redesigned student settings page (Profile section).
-- The prototype Profile section exposes avatar, bio, and location; the profiles
-- table previously had none. Nullable + IF NOT EXISTS so existing rows are
-- untouched and the migration is safe to re-run. Existing RLS already lets a
-- user update their own profile row.

alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists location text;
