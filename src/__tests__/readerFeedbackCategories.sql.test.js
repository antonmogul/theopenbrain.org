// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = readFileSync(
  "supabase/migrations/20261119450000_reader_feedback_categories.sql",
  "utf8"
);
const original = readFileSync(
  "supabase/migrations/20260926000000_feedback.sql",
  "utf8"
);
const databases = [];
const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";
async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  databases.push(db);
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function public.is_creator() returns boolean language sql stable as
      $$ select current_setting('request.jwt.claim.role', true) = 'creator' $$;
    grant usage on schema auth to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    create table public.modules (id uuid primary key);
    create table public.sections (id uuid primary key);
    insert into auth.users values ('${ALICE}'), ('${BOB}');
  `);
  await db.exec(original);
  return db;
}
async function asReader(db, id, sql) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${id}';`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}
afterEach(async () => {
  for (const db of databases.splice(0)) await db.close();
});

describe.skipIf(!harness || !existsSync(harness))(
  "reader feedback categories SQL",
  () => {
    it("preserves legacy messages, accepts every category and replays safely", async () => {
      const db = await fresh();
      for (const kind of ["general", "content", "bug", "idea"]) {
        await asReader(
          db,
          ALICE,
          `insert into feedback (kind,message) values ('${kind}','Legacy message')`
        );
      }
      await db.exec(migration);
      await db.exec(migration);
      for (const kind of [
        "content",
        "usability",
        "design",
        "bug",
        "idea",
        "other",
      ]) {
        await asReader(
          db,
          BOB,
          `insert into feedback (kind,message) values ('${kind}','New message')`
        );
      }
      expect((await db.query("select * from feedback")).rows).toHaveLength(10);
      await expect(
        asReader(
          db,
          ALICE,
          "insert into feedback(kind,message) values ('unknown','No')"
        )
      ).rejects.toThrow(/feedback_kind_check/);
      await expect(
        asReader(
          db,
          ALICE,
          "insert into feedback(kind,message) values ('other',' ')"
        )
      ).rejects.toThrow(/feedback_message_check/);
    });
    it("keeps ownership, creator reads and anonymous access unchanged", async () => {
      const db = await fresh();
      await db.exec(migration);
      await asReader(
        db,
        ALICE,
        "insert into feedback(kind,message) values ('usability','Navigation')"
      );
      expect(
        (await asReader(db, ALICE, "select * from feedback")).rows
      ).toHaveLength(1);
      expect(
        (await asReader(db, BOB, "select * from feedback")).rows
      ).toHaveLength(0);
      await expect(
        asReader(
          db,
          BOB,
          `insert into feedback(user_id,kind,message) values ('${ALICE}','design','Spoof')`
        )
      ).rejects.toThrow(/row-level security/);
      await db.exec("set request.jwt.claim.role = 'creator'");
      expect(
        (await asReader(db, BOB, "select * from feedback")).rows
      ).toHaveLength(1);
      await db.exec("set role anon");
      expect((await db.query("select * from feedback")).rows).toHaveLength(0);
      await expect(
        db.exec(
          "insert into feedback(kind,message) values ('other','Anonymous')"
        )
      ).rejects.toThrow(/row-level security/);
      await db.exec("reset role");
    });
    it("refuses an unexpected constraint without replacing it", async () => {
      const db = await fresh();
      await db.exec(
        "alter table feedback drop constraint feedback_kind_check; alter table feedback add constraint feedback_kind_check check (kind in ('general','custom'))"
      );
      await expect(db.exec(migration)).rejects.toThrow(
        /Unexpected feedback_kind_check/
      );
      await db.exec(
        `insert into feedback(user_id,kind,message) values ('${ALICE}','custom','Kept')`
      );
    });
    it("refuses a missing prerequisite", async () => {
      const db = await fresh();
      await db.exec("drop table feedback");
      await expect(db.exec(migration)).rejects.toThrow(/prerequisite missing/);
    });
  }
);
