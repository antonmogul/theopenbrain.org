-- OPENBRAIN-129 review: only creators can list the chapter-media bucket.
--
-- 20260924000000_chapter_media_bucket.sql gave anon and authenticated SELECT
-- on storage.objects for the bucket ("Anyone reads chapter media"). A public
-- bucket serves /storage/v1/object/public/ URLs without any SELECT policy
-- (those downloads skip RLS), so the policy's only effect was to let the
-- publishable key in the page call POST /storage/v1/object/list/chapter-media
-- and walk every folder: draft chapters under modules/<slug>/ and every deck
-- with an upload under decks/<id>/, with their file names (Supabase's advisor
-- lint 0025, "public bucket allows listing").
--
-- SELECT becomes creators only. Public URLs keep working for everyone (the
-- reader, /deck and share links load images that way, and nothing in the app
-- lists the bucket), and creators keep SELECT for the storage-api operations
-- that read rows (an upload's RETURNING, list, remove). The bucket keeps four
-- "chapter media" policies, so the 20260924 self-check still describes it.
--
-- Idempotent. No BEGIN/COMMIT: `supabase db push` runs the file in one
-- transaction. Push after 20261007010100_seed_funding_deck.sql (it does not
-- depend on the deck files; it only sorts after them).

drop policy if exists "Anyone reads chapter media" on storage.objects;
drop policy if exists "Creators read chapter media" on storage.objects;
create policy "Creators read chapter media" on storage.objects
  for select to authenticated
  using (bucket_id = 'chapter-media' and public.is_creator());

-- ── self-check ─────────────────────────────────────────────────────────────
-- Fails the push if anyone but a creator could still list the bucket: a
-- SELECT (or ALL) policy that names chapter-media and reaches anon/public or
-- does without is_creator(), or one that names no bucket and reaches
-- anon/public.
do $$
declare bad integer;
begin
  if not exists (select 1 from storage.buckets where id = 'chapter-media' and public) then
    raise exception 'chapter media: bucket missing or not public';
  end if;
  select count(*) into bad from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and permissive = 'PERMISSIVE'
     and cmd in ('SELECT', 'ALL')
     and ((coalesce(qual, '') ~ 'chapter-media'
           and ('anon'::name = any (roles)
                or 'public'::name = any (roles)
                or coalesce(qual, '') !~ 'is_creator'))
          or (coalesce(qual, '') !~ 'bucket_id'
              and ('anon'::name = any (roles) or 'public'::name = any (roles))));
  if bad > 0 then
    raise exception 'chapter media: % read policies let non-creators list the bucket', bad;
  end if;
  if (select count(*) from pg_policy
       where polrelid = 'storage.objects'::regclass
         and polname like '%chapter media%') <> 4 then
    raise exception 'chapter media: expected 4 storage policies';
  end if;
end $$;
