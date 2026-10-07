// @vitest-environment node
/** Isolated execution test for 20261007010200_chapter_media_no_listing.sql
 * (OPENBRAIN-129 review). Run with
 *   HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npx vitest run \
 *     --pool=forks src/__tests__/chapterMediaListing.sql.test.js
 * It skips when that variable is absent, like the other *.sql.test.js files.
 *
 * It applies the real migrations the bucket depends on (the initial schema,
 * for profiles; the RLS lockdown, for public.is_creator()), then the bucket
 * migration 20260924000000 and this one, on a stand-in for Supabase Storage:
 * storage.buckets and storage.objects with RLS and Supabase's grants. A
 * storage-api list is a SELECT on storage.objects as the caller's role, so a
 * SELECT here under SET ROLE is what the publishable key's list request sees.
 * Public /object/public/ downloads skip RLS and are not modelled.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = (name) =>
  readFileSync(`supabase/migrations/${name}.sql`, "utf8");
const bucket = migration("20260924000000_chapter_media_bucket");
const noListing = migration("20261007010200_chapter_media_no_listing");
const schema = [
  migration("20250101000000_initial_schema").replace(
    /^CREATE EXTENSION .*$/gm,
    ""
  ),
  migration("20260923000000_rls_lockdown_content_and_profiles"),
];
const supabaseStandIn = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id), name text,
  owner uuid default auth.uid());
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant all on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;
`;

const CAROL = "00000000-0000-0000-0000-00000000000c"; // creator
const BOB = "00000000-0000-0000-0000-00000000000b"; // student

let db;

afterEach(async () => {
  if (db) await db.close();
  db = null;
});

async function setup() {
  const { PGlite } = require(harness);
  db = new PGlite();
  await db.exec(supabaseStandIn);
  for (const sql of schema) await db.exec(sql);
  for (const [id, role] of [
    [CAROL, "creator"],
    [BOB, "student"],
  ]) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [
      id,
      `${role}@uni.edu`,
    ]);
    await db.query(
      "insert into profiles (id, email, full_name, role) values ($1, $2, $3, $4)",
      [id, `${role}@uni.edu`, role, role]
    );
  }
  await db.exec(bucket);
  await db.exec(`insert into storage.objects (bucket_id, name) values
    ('chapter-media', 'decks/0b4f6d1e-0000-4000-8000-000000000001/a.png'),
    ('chapter-media', 'modules/stress/b.png')`);
}

async function as(user, fn) {
  await db.exec(user ? "set role authenticated" : "set role anon");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    user || "",
  ]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

// What POST /storage/v1/object/list/chapter-media returns for the caller.
const list = (user) =>
  as(
    user,
    async () =>
      (
        await db.query(
          "select name from storage.objects where bucket_id = 'chapter-media' order by name"
        )
      ).rows
  );

describe.skipIf(!harness)(
  "chapter-media listing (OPENBRAIN-129 review) in isolated PGlite",
  () => {
    it("stops anon and readers listing the bucket; creators still can", async () => {
      await setup();
      // Before: the publishable key walks every folder.
      expect(await list(null)).toHaveLength(2);

      await db.exec(noListing);
      expect(await list(null)).toEqual([]);
      expect(await list(BOB)).toEqual([]);
      expect((await list(CAROL)).map((r) => r.name)).toEqual([
        "decks/0b4f6d1e-0000-4000-8000-000000000001/a.png",
        "modules/stress/b.png",
      ]);
      // The bucket stays public, so /object/public/ URLs keep working.
      expect(
        (await db.query("select public from storage.buckets")).rows
      ).toEqual([{ public: true }]);

      // Uploads: creators only, as before (an upload reads its row back).
      await expect(
        as(null, () =>
          db.query(
            "insert into storage.objects (bucket_id, name) values ('chapter-media', 'decks/x/y.png')"
          )
        )
      ).rejects.toThrow(/row-level security/);
      await expect(
        as(CAROL, () =>
          db.query(
            "insert into storage.objects (bucket_id, name) values ('chapter-media', 'decks/x/y.png') returning name"
          )
        )
      ).resolves.toMatchObject({ rows: [{ name: "decks/x/y.png" }] });
    }, 60000);

    it("reapplies, and fails the push if a later change lets anon list again", async () => {
      await setup();
      await db.exec(noListing);
      await expect(db.exec(noListing)).resolves.toBeDefined();
      await db.exec(
        `create policy "Anyone reads chapter media" on storage.objects
           for select to anon, authenticated using (bucket_id = 'chapter-media')`
      );
      // The file drops that policy by name, so a rerun repairs it…
      await expect(db.exec(noListing)).resolves.toBeDefined();
      expect(await list(null)).toEqual([]);
      // …and a differently named one stops the push.
      await db.exec(
        `create policy "Readers list chapter media" on storage.objects
           for select to authenticated using (bucket_id = 'chapter-media')`
      );
      await expect(db.exec(noListing)).rejects.toThrow(
        /read policies let non-creators list the bucket/
      );
      await db.exec(
        `drop policy "Readers list chapter media" on storage.objects;
         create policy "Anyone lists everything" on storage.objects
           for select to anon using (true)`
      );
      await expect(db.exec(noListing)).rejects.toThrow(
        /read policies let non-creators list the bucket/
      );
    }, 60000);
  }
);
