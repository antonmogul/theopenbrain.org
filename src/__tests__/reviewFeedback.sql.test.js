// @vitest-environment node
/** Isolated execution test for 20261118130000_review_feedback.sql
 * (OPENBRAIN-203). Run with
 *   HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npx vitest run \
 *     --pool=forks src/__tests__/reviewFeedback.sql.test.js
 * It skips when that variable is absent, like the other *.sql.test.js files.
 *
 * It applies the real migrations that define profiles and public.is_creator()
 * (the initial schema without its CREATE EXTENSION lines, and the RLS
 * lockdown), then this migration, on a small Supabase stand-in: the anon and
 * authenticated roles, auth.uid() from request.jwt.claim.sub, and Supabase's
 * default grants (so the migration's revokes are tested against them). Each
 * request runs under SET ROLE with that claim and, when given, PostgREST's
 * request.headers, so RLS, the grants and the SECURITY DEFINER functions
 * behave as they do behind PostgREST. Not modelled: PostgREST's mapping of the
 * error codes to HTTP statuses, and concurrent writers.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = (name) =>
  readFileSync(`supabase/migrations/${name}.sql`, "utf8");
const review = migration("20261118130000_review_feedback");
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
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const STUDENT = "00000000-0000-0000-0000-00000000000b";
const CREATOR = "00000000-0000-0000-0000-00000000000c";
const PARAGRAPH = "11111111-2222-4333-8444-555555555555";

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
    [STUDENT, "student"],
    [CREATOR, "creator"],
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
  await db.exec(review);
}

// One PostgREST-style request: anon (user null) or a signed-in user.
async function as(user, fn, { ip } = {}) {
  await db.exec(user ? "set role authenticated" : "set role anon");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    user || "",
  ]);
  await db.query("select set_config('request.headers', $1, false)", [
    ip ? JSON.stringify({ "x-forwarded-for": ip }) : "",
  ]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
    await db.query("select set_config('request.headers', '', false)");
  }
}

const NOTE = {
  chapter_slug: "the-retina",
  section_slug: "photoreceptors",
  paragraph_id: PARAGRAPH,
  type: "content",
  note: "Rods outnumber cones about 20 to 1, not 10 to 1.",
  anchor: {
    v: 1,
    kind: "paragraph",
    label: "¶ 3 in “Photoreceptors”",
    paragraphId: PARAGRAPH,
    point: { x: 0.4, y: 0.2 },
  },
  reviewer_name: "Stuart",
  reviewer_role: "author",
  url: "https://example.test/chapter/2/the-retina",
  viewport: "1440×900",
  user_agent: "Mozilla/5.0",
};

function submit(p, { user = null, ip } = {}) {
  return as(
    user,
    async () =>
      (await db.query("select public.submit_review_feedback($1) as r", [p]))
        .rows[0].r,
    { ip }
  );
}

function status(ids, user = null) {
  return as(
    user,
    async () =>
      (
        await db.query(
          "select * from public.review_feedback_status($1::uuid[])",
          [ids]
        )
      ).rows
  );
}

async function rows() {
  return (
    await db.query("select * from public.review_feedback order by created_at")
  ).rows;
}

describe.skipIf(!harness)(
  "review_feedback (OPENBRAIN-203) in isolated PGlite",
  () => {
    it("stores a note sent by anon through the RPC, with the signed-in user when there is one", async () => {
      await setup();
      const out = await submit(
        { ...NOTE, client_id: "q-1" },
        { ip: "1.2.3.4" }
      );
      expect(out).toEqual({ id: expect.any(String), status: "new" });
      const [row] = await rows();
      expect(row).toMatchObject({
        id: out.id,
        chapter_slug: "the-retina",
        section_slug: "photoreceptors",
        paragraph_id: PARAGRAPH,
        type: "content",
        reviewer_name: "Stuart",
        reviewer_role: "author",
        user_id: null,
        status: "new",
        client_id: "q-1",
        reply: null,
      });
      expect(row.anchor).toEqual(NOTE.anchor);
      expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(row.ip_hash).not.toContain("1.2.3.4");

      await submit({ ...NOTE, client_id: "q-2" }, { user: STUDENT });
      expect((await rows())[1].user_id).toBe(STUDENT);
    }, 60000);

    it("returns the same row for a retried client_id", async () => {
      await setup();
      const first = await submit({ ...NOTE, client_id: "abc_123" });
      const again = await submit({
        ...NOTE,
        note: "edited before the retry",
        client_id: "abc_123",
      });
      expect(again).toEqual(first);
      expect(await rows()).toHaveLength(1);
      expect((await rows())[0].note).toBe(NOTE.note);
    }, 60000);

    it("validates and caps every field", async () => {
      await setup();
      const bad = async (p, detail) => {
        const error = await submit(p).catch((e) => e);
        expect(error, JSON.stringify(p).slice(0, 80)).toBeInstanceOf(Error);
        expect(error.message).toBe("review_invalid");
        if (detail) expect(error.detail).toMatch(detail);
      };
      await bad(null);
      await bad([1, 2]);
      await bad({ ...NOTE, chapter_slug: "" }, /chapter_slug/);
      await bad({ ...NOTE, chapter_slug: "../etc" }, /chapter_slug/);
      await bad({ ...NOTE, type: "spam" }, /type/);
      await bad({ ...NOTE, paragraph_id: "p-1" }, /paragraph_id/);
      await bad({ ...NOTE, reviewer_name: "   " }, /reviewer_name/);
      await bad({ ...NOTE, reviewer_role: "admin" }, /reviewer_role/);
      await bad({ ...NOTE, anchor: [1] }, /anchor/);
      await bad({ ...NOTE, anchor: { blob: "x".repeat(17000) } }, /anchor/);
      await bad({ ...NOTE, client_id: "has space" }, /client_id/);
      // Needs a note, or both the quote and the suggested text.
      await bad({ ...NOTE, note: "  " }, /required/);
      await bad({ ...NOTE, note: null, quote: "rods" }, /required/);
      expect(await rows()).toEqual([]);

      await submit({
        ...NOTE,
        note: null,
        quote: "10 to 1",
        suggested_text: "20 to 1",
        anchor: null,
        reviewer_role: "",
        section_slug: "",
        paragraph_id: "",
      });
      await submit({
        ...NOTE,
        chapter_slug: " The-Retina ",
        type: "BUG",
        note: "n".repeat(5000),
        quote: "q".repeat(3000),
        suggested_text: "s".repeat(5000),
        reviewer_name: "  " + "N".repeat(100),
        url: "u".repeat(3000),
        viewport: "v".repeat(300),
        user_agent: "a".repeat(900),
      });
      const [pair, long] = await rows();
      expect(pair).toMatchObject({
        note: null,
        quote: "10 to 1",
        suggested_text: "20 to 1",
        anchor: {},
        reviewer_role: null,
        section_slug: null,
        paragraph_id: null,
      });
      expect(long.chapter_slug).toBe("the-retina");
      expect(long.type).toBe("bug");
      expect(
        [
          long.note,
          long.quote,
          long.suggested_text,
          long.reviewer_name,
          long.url,
          long.viewport,
          long.user_agent,
        ].map((s) => s.length)
      ).toEqual([4000, 2000, 4000, 80, 2000, 100, 500]);
    }, 60000);

    it("limits one address to 120 notes an hour and everyone to 2000", async () => {
      await setup();
      for (let i = 0; i < 120; i++)
        await submit(
          { ...NOTE, client_id: `ip-${i}` },
          { ip: "9.9.9.9, 10.0.0.1" }
        );
      const error = await submit(NOTE, { ip: "9.9.9.9" }).catch((e) => e);
      expect(error.message).toBe("review_rate_limited");
      expect(error.code).toBe("PT429");
      // A retry of a stored note still answers, and another address may send.
      expect(
        (await submit({ ...NOTE, client_id: "ip-7" }, { ip: "9.9.9.9" })).status
      ).toBe("new");
      await submit(NOTE, { ip: "8.8.8.8" });
      // An hour later the address may send again.
      await db.exec(
        "update review_feedback set created_at = now() - interval '61 minutes'"
      );
      await submit(NOTE, { ip: "9.9.9.9" });

      // The overall cap, without an address (no x-forwarded-for: no IP limit).
      await db.exec(`insert into review_feedback (chapter_slug, type, note, reviewer_name)
        select 'the-retina', 'note', 'filler', 'bot' from generate_series(1, 1999)`);
      const flood = await submit(NOTE).catch((e) => e);
      expect(flood.message).toBe("review_rate_limited");
    }, 120000);

    it("gives anon and readers no direct access to the table", async () => {
      await setup();
      const { id } = await submit(NOTE);
      for (const user of [null, STUDENT]) {
        await expect(
          as(user, () => db.query("select * from review_feedback"))
        ).rejects.toThrow(/permission denied/);
        await expect(
          as(user, () =>
            db.query(
              "insert into review_feedback (chapter_slug, type, note, reviewer_name) values ('x', 'note', 'n', 'n')"
            )
          )
        ).rejects.toThrow(/permission denied/);
      }
      await expect(
        as(null, () => db.query("update review_feedback set status = 'done'"))
      ).rejects.toThrow(/permission denied/);
      await expect(
        as(null, () => db.query("delete from review_feedback"))
      ).rejects.toThrow(/permission denied/);
      // A signed-in non-creator has the column grants (creators need them)
      // but RLS shows and changes nothing.
      const seen = await as(
        STUDENT,
        async () => (await db.query("select id from review_feedback")).rows
      );
      expect(seen).toEqual([]);
      await as(STUDENT, () =>
        db.query("update review_feedback set status = 'done', reply = 'x'")
      );
      await as(STUDENT, () => db.query("delete from review_feedback"));
      expect(await rows()).toMatchObject([{ id, status: "new", reply: null }]);
      await expect(
        as(null, () => db.query("select public.review_feedback_touch()"))
      ).rejects.toThrow();
    }, 60000);

    it("lets a creator read every note, answer it and delete it, but not rewrite it", async () => {
      await setup();
      const a = await submit(NOTE);
      const b = await submit({
        ...NOTE,
        chapter_slug: "foundations-of-neuroscience",
      });
      const read = await as(
        CREATOR,
        async () =>
          (
            await db.query(
              "select id, reviewer_name, anchor from review_feedback order by created_at"
            )
          ).rows
      );
      expect(read.map((r) => r.id)).toEqual([a.id, b.id]);
      // The address hash is not readable, by creators either.
      await expect(
        as(CREATOR, () => db.query("select ip_hash from review_feedback"))
      ).rejects.toThrow(/permission denied/);
      await expect(
        as(CREATOR, () =>
          db.query(
            "update review_feedback set note = 'rewritten' where id = $1",
            [a.id]
          )
        )
      ).rejects.toThrow(/permission denied/);

      const before = (await rows())[0];
      const updated = await as(
        CREATOR,
        async () =>
          (
            await db.query(
              "update review_feedback set status = 'done', reply = '  Fixed in the text.  ' where id = $1 returning status, reply, replied_at, updated_at",
              [a.id]
            )
          ).rows
      );
      expect(updated).toHaveLength(1);
      expect(updated[0].status).toBe("done");
      expect(updated[0].reply).toBe("Fixed in the text.");
      expect(updated[0].replied_at).toBeInstanceOf(Date);
      expect(updated[0].updated_at.getTime()).toBeGreaterThanOrEqual(
        before.updated_at.getTime()
      );
      await expect(
        as(CREATOR, () =>
          db.query(
            "update review_feedback set status = 'closed' where id = $1",
            [a.id]
          )
        )
      ).rejects.toThrow(/check constraint/);

      // Status only: the reply and its time stay; clearing the reply clears the time.
      const [{ replied_at: first }] = (
        await db.query("select replied_at from review_feedback where id = $1", [
          a.id,
        ])
      ).rows;
      await as(CREATOR, () =>
        db.query(
          "update review_feedback set status = 'question' where id = $1",
          [a.id]
        )
      );
      expect(
        (
          await db.query(
            "select reply, replied_at from review_feedback where id = $1",
            [a.id]
          )
        ).rows[0]
      ).toEqual({ reply: "Fixed in the text.", replied_at: first });
      await as(CREATOR, () =>
        db.query("update review_feedback set reply = ' ' where id = $1", [a.id])
      );
      expect(
        (
          await db.query(
            "select reply, replied_at from review_feedback where id = $1",
            [a.id]
          )
        ).rows[0]
      ).toEqual({ reply: null, replied_at: null });

      await as(CREATOR, () =>
        db.query("delete from review_feedback where id = $1", [b.id])
      );
      expect((await rows()).map((r) => r.id)).toEqual([a.id]);
    }, 60000);

    it("answers status and reply for the asked ids only, to anyone", async () => {
      await setup();
      const a = await submit(NOTE);
      const b = await submit(NOTE);
      await as(CREATOR, () =>
        db.query(
          "update review_feedback set status = 'doing', reply = 'On it' where id = $1",
          [a.id]
        )
      );
      const answer = await status([
        a.id,
        "00000000-0000-4000-8000-000000000000",
      ]);
      expect(answer).toEqual([
        {
          id: a.id,
          status: "doing",
          reply: "On it",
          replied_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      ]);
      expect(Object.keys(answer[0]).sort()).toEqual([
        "id",
        "replied_at",
        "reply",
        "status",
        "updated_at",
      ]);
      expect(await status([b.id], STUDENT)).toMatchObject([
        { id: b.id, status: "new", reply: null },
      ]);
      expect(await status([])).toEqual([]);
      expect(await status(null)).toEqual([]);

      // At most 200 ids are answered.
      const filler = Array.from(
        { length: 200 },
        (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`
      );
      expect(await status([...filler, a.id])).toEqual([]);
      expect(await status([a.id, ...filler])).toHaveLength(1);

      const { rows: fns } = await db.query(
        `select proname, prosecdef, provolatile from pg_proc
          where proname in ('submit_review_feedback', 'review_feedback_status') order by proname`
      );
      expect(fns).toEqual([
        {
          proname: "review_feedback_status",
          prosecdef: true,
          provolatile: "s",
        },
        {
          proname: "submit_review_feedback",
          prosecdef: true,
          provolatile: "v",
        },
      ]);
    }, 60000);

    it("reruns cleanly", async () => {
      await setup();
      const { id } = await submit({ ...NOTE, client_id: "keep" });
      await db.exec(review);
      expect((await rows()).map((r) => r.id)).toEqual([id]);
      await expect(
        as(null, () => db.query("select * from review_feedback"))
      ).rejects.toThrow(/permission denied/);
      expect((await submit({ ...NOTE, client_id: "keep" })).id).toBe(id);
    }, 60000);
  }
);
