// @vitest-environment node
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261124079600_reader_events.sql",
  "utf8"
);
const A = "00000000-0000-0000-0000-000000000001",
  B = "00000000-0000-0000-0000-000000000002",
  M = "00000000-0000-0000-0000-000000000003",
  D = "00000000-0000-0000-0000-000000000004";
describe.skipIf(!harness)("reader events real SQL RLS", () => {
  it("is idempotent; anon denied; owners select/insert only; drafts and other owners denied", async () => {
    const { PGlite } = require(harness);
    const db = new PGlite();
    try {
      await db.exec(
        `create role anon; create role authenticated; create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated; create table profiles(id uuid primary key); create table modules(id uuid primary key,status text); grant select on modules to authenticated; insert into profiles values ('${A}'),('${B}'); insert into modules values ('${M}','published'),('${D}','draft');`
      );
      await db.exec(sql);
      await db.exec(sql);
      await db.exec("set role anon");
      await expect(db.query("select * from reader_events")).rejects.toThrow();
      await expect(
        db.query(
          `insert into reader_events(user_id,module_id,kind,ref) values ('${A}','${M}','video_play','v')`
        )
      ).rejects.toThrow();
      await db.exec(
        `reset role; set role authenticated; set request.jwt.claim.sub='${A}';`
      );
      await db.query(
        `insert into reader_events(user_id,module_id,kind,ref) values ('${A}','${M}','video_play','v')`
      );
      expect((await db.query("select * from reader_events")).rows).toHaveLength(
        1
      );
      await expect(
        db.query(
          `insert into reader_events(user_id,module_id,kind,ref) values ('${B}','${M}','video_play','v')`
        )
      ).rejects.toThrow();
      await expect(
        db.query(
          `insert into reader_events(user_id,module_id,kind,ref) values ('${A}','${D}','video_play','v')`
        )
      ).rejects.toThrow();
      await expect(
        db.query(`update reader_events set ref='changed'`)
      ).rejects.toThrow();
      await expect(db.query("delete from reader_events")).rejects.toThrow();
      await db.exec(`set request.jwt.claim.sub='${B}'`);
      expect((await db.query("select * from reader_events")).rows).toHaveLength(
        0
      );
    } finally {
      await db.close();
    }
  }, 30000);
});
