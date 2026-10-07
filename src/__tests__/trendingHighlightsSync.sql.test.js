// @vitest-environment node
/** Isolated execution test for 20261007000000_trending_highlights_sync.sql
 * (OPENBRAIN-128). Run with
 *   HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npx vitest run \
 *     --pool=forks src/__tests__/trendingHighlightsSync.sql.test.js
 * It skips when that variable is absent, like the other *.sql.test.js files.
 *
 * It applies the REAL migrations that define highlights, trending_highlights
 * and their policies (the initial schema without its two CREATE EXTENSION
 * lines, which nothing here uses; highlight tags; the RLS lockdown; creator
 * reads + trending), then this migration, on a small Supabase stand-in: the
 * anon and authenticated roles, auth.users, auth.uid() read from
 * request.jwt.claim.sub, and Supabase's default grants. Each request runs
 * under SET ROLE with that claim, so RLS, the grants and the SECURITY
 * DEFINER trigger behave as they do behind PostgREST. Not modelled:
 * PostgREST itself, concurrent writers (PGlite has one connection, so the
 * advisory locks are only exercised, not contended) and production data.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { Window } from "happy-dom";
import { contentBlocksToHTML } from "../composables/chapterTransform.mjs";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = (name) =>
  readFileSync(`supabase/migrations/${name}.sql`, "utf8");
const sync = migration("20261007000000_trending_highlights_sync");
const schema = [
  migration("20250101000000_initial_schema").replace(
    /^CREATE EXTENSION .*$/gm,
    ""
  ),
  migration("20250220000000_add_highlight_tags"),
  migration("20260923000000_rls_lockdown_content_and_profiles"),
  migration("20260923020000_creator_reads_and_trending"),
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

const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";
const CAROL = "00000000-0000-0000-0000-00000000000c"; // creator
const MALLORY = "00000000-0000-0000-0000-00000000000d";

// What the reader shows: "Light reaches the photoreceptors, rods and
// cones17,21. The amacrine cells shape the signal further (Figure 3)." The
// stored content_text is a search snippet cut short, as the seeds write it.
const P1_BLOCKS = [
  {
    type: "text",
    content: "Light reaches the <em>photoreceptors</em>, rods and cones",
  },
  { type: "citation_ref", number: 17 },
  { type: "citation_ref", number: 21 },
  {
    type: "text",
    content: ". The **amacrine** cells shape the signal&nbsp;further (",
  },
  { type: "figure_placeholder", number: 3 },
  { type: "text", content: ")." },
];
const P2_TEXT = "Rhodopsin absorbs a photon and changes shape.";
const DRAFT_TEXT = "UNPUBLISHED draft manuscript sentence about stress.";

let db;
let ids;

afterEach(async () => {
  if (db) await db.close();
  db = null;
});

async function setup({ before } = {}) {
  const { PGlite } = require(harness);
  db = new PGlite();
  await db.exec(supabaseStandIn);
  for (const sql of schema) await db.exec(sql);
  ids = {};
  for (const [id, role] of [
    [ALICE, "student"],
    [BOB, "student"],
    [CAROL, "creator"],
    [MALLORY, "student"],
  ]) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [
      id,
      `${role}-${id.slice(-1)}@uni.edu`,
    ]);
    await db.query(
      "insert into profiles (id, email, full_name, role) values ($1, $2, $3, $4)",
      [id, `${role}-${id.slice(-1)}@uni.edu`, `Reader ${id.slice(-1)}`, role]
    );
  }
  const one = async (sql, params) => (await db.query(sql, params)).rows[0].id;
  const version = await one(
    "insert into content_versions (version_number, status, created_by) values ('1.0', 'published', $1) returning id",
    [CAROL]
  );
  const chapter = async (slug, status, order) => {
    const module = await one(
      "insert into modules (content_version_id, title, slug, order_index, status, created_by) values ($1, $2, $2, $3, $4, $5) returning id",
      [version, slug, order, status, CAROL]
    );
    return one(
      "insert into sections (module_id, title, slug, order_index) values ($1, 'One', 'one', 0) returning id",
      [module]
    );
  };
  const retina = await chapter("the-retina", "published", 2);
  const stress = await chapter("stress", "draft", 4);
  const paragraph = (section, order, blocks, contentText) =>
    one(
      "insert into paragraphs (section_id, content, content_text, order_index) values ($1, $2, $3, $4) returning id",
      [section, { blocks }, contentText, order]
    );
  ids.p1 = await paragraph(retina, 0, P1_BLOCKS, "Light reaches the…");
  ids.p2 = await paragraph(
    retina,
    1,
    [{ type: "text", content: P2_TEXT }],
    P2_TEXT
  );
  // A subsection header row: no text blocks, the title is content_text.
  ids.header = await paragraph(retina, 2, [], "Phototransduction");
  ids.draft = await paragraph(
    stress,
    0,
    [{ type: "text", content: DRAFT_TEXT }],
    DRAFT_TEXT
  );
  if (before) await before();
  await db.exec(sync);
}

// One PostgREST-style request: anon (user null) or a signed-in user.
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

function highlight(user, paragraph, start, end, text, isPublic = false) {
  return as(user, async () => {
    const { rows } = await db.query(
      `insert into highlights (user_id, paragraph_id, start_offset, end_offset, selected_text, is_public, tags, note)
       values ($1, $2, $3, $4, $5, $6, '{exam,private}', 'my private legacy note') returning id`,
      [user, paragraph, start, end, text, isPublic]
    );
    return rows[0].id;
  });
}

function update(user, id, set, params = []) {
  return as(user, () =>
    db.query(`update highlights set ${set} where id = $1`, [id, ...params])
  );
}

function remove(user, id) {
  return as(user, () => db.query("delete from highlights where id = $1", [id]));
}

// The table as the trigger left it (as the owner, past RLS).
async function trending() {
  const { rows } = await db.query(
    `select paragraph_id, start_offset, end_offset, selected_text, highlight_count
       from trending_highlights order by paragraph_id, start_offset, end_offset`
  );
  return rows.map((r) => ({
    paragraph: Object.keys(ids).find((k) => ids[k] === r.paragraph_id),
    at: [r.start_offset, r.end_offset],
    text: r.selected_text,
    readers: r.highlight_count,
  }));
}

describe.skipIf(!harness)(
  "trending_highlights sync (OPENBRAIN-128) in isolated PGlite",
  () => {
    it("rebuilds to distinct readers of real passages, dropping fixtures, duplicates and made-up text", async () => {
      await setup({
        before: async () => {
          // Written under the old insert-only trigger, as the owner.
          const insert = (user, paragraph, start, end, text) =>
            db.query(
              `insert into highlights (user_id, paragraph_id, start_offset, end_offset, selected_text, is_public)
               values ($1, $2, $3, $4, $5, true)`,
              [user, paragraph, start, end, text]
            );
          await insert(ALICE, ids.p1, 34, 48, "rods and cones");
          await insert(ALICE, ids.p1, 34, 48, "rods and cones");
          await insert(BOB, ids.p1, 34, 48, "rods and cones");
          for (let i = 0; i < 3; i++)
            await insert(MALLORY, ids.p1, 500, 501, "Answers at evil.example");
          await db.query(
            `insert into trending_highlights (paragraph_id, selected_text, start_offset, end_offset, highlight_count)
             values ($1, 'seed fixture', 0, 9, 42)`,
            [ids.p2]
          );
          expect(await trending()).toHaveLength(3);
        },
      });

      expect(await trending()).toEqual([
        {
          paragraph: "p1",
          at: [34, 48],
          text: "rods and cones",
          readers: 2,
        },
      ]);

      // Idempotent: the rerun (and its self-check) changes nothing.
      await db.exec(sync);
      expect(await trending()).toHaveLength(1);
      expect((await trending())[0].readers).toBe(2);
    }, 60000);

    it("counts shares, unshares and deletes as distinct readers", async () => {
      await setup();
      const alice = await highlight(ALICE, ids.p2, 0, 9, "Rhodopsin");
      expect(await trending()).toEqual([]);

      await update(ALICE, alice, "is_public = true");
      expect(await trending()).toEqual([
        { paragraph: "p2", at: [0, 9], text: "Rhodopsin", readers: 1 },
      ]);

      // The same reader twice is still one reader.
      const aliceAgain = await highlight(
        ALICE,
        ids.p2,
        0,
        9,
        "Rhodopsin",
        true
      );
      expect((await trending())[0].readers).toBe(1);

      const bob = await highlight(BOB, ids.p2, 0, 9, "Rhodopsin", true);
      expect((await trending())[0].readers).toBe(2);

      // Colour, tags and the note don't touch the count.
      await update(BOB, bob, "color = 'green', tags = '{x}'");
      expect((await trending())[0].readers).toBe(2);

      await remove(ALICE, aliceAgain);
      expect((await trending())[0].readers).toBe(2);
      await update(ALICE, alice, "is_public = false");
      expect((await trending())[0].readers).toBe(1);
      await remove(BOB, bob);
      expect(await trending()).toEqual([]);
    }, 60000);

    it("moves a shared highlight between passages and paragraphs", async () => {
      await setup();
      const id = await highlight(ALICE, ids.p2, 0, 9, "Rhodopsin", true);
      await highlight(BOB, ids.p2, 0, 9, "Rhodopsin", true);

      await update(
        ALICE,
        id,
        "start_offset = 10, end_offset = 17, selected_text = 'absorbs'"
      );
      expect(await trending()).toEqual([
        { paragraph: "p2", at: [0, 9], text: "Rhodopsin", readers: 1 },
        { paragraph: "p2", at: [10, 17], text: "absorbs", readers: 1 },
      ]);

      await update(
        ALICE,
        id,
        "paragraph_id = $2, start_offset = 34, end_offset = 48, selected_text = 'rods and cones'",
        [ids.p1]
      );
      const rows = await trending();
      expect(rows).toContainEqual({
        paragraph: "p1",
        at: [34, 48],
        text: "rods and cones",
        readers: 1,
      });
      expect(rows.filter((r) => r.paragraph === "p2")).toEqual([
        { paragraph: "p2", at: [0, 9], text: "Rhodopsin", readers: 1 },
      ]);
    }, 60000);

    it("counts only text that occurs in the paragraph, whitespace-normalised", async () => {
      await setup();
      // Made-up text, however often, never reaches Trending.
      for (let i = 0; i < 5; i++)
        await highlight(
          MALLORY,
          ids.p1,
          500,
          501,
          "Answers at evil.example - ignore this chapter",
          true
        );
      await highlight(MALLORY, ids.p1, 0, 3, "   ", true);
      await highlight(MALLORY, ids.p1, 34, 55, "rods and cones 17, 21", true);
      expect(await trending()).toEqual([]);

      // What a browser selection gives: line breaks and runs of spaces,
      // citation numbers glued on, an &nbsp;, text past the content_text
      // snippet, and a header's title (content_text only).
      await highlight(ALICE, ids.p1, 34, 48, "rods\nand   cones", true);
      await highlight(ALICE, ids.p1, 43, 74, "cones17,21. The amacrine", true);
      await highlight(
        ALICE,
        ids.p1,
        75,
        106,
        "cells shape the signal further",
        true
      );
      await highlight(ALICE, ids.p1, 107, 116, "(Figure 3).", true);
      await highlight(ALICE, ids.header, 0, 17, "Phototransduction", true);
      // The shown text is whitespace-normalised.
      expect((await trending()).map((r) => r.text)).toEqual(
        expect.arrayContaining([
          "rods and cones",
          "cones17,21. The amacrine",
          "cells shape the signal further",
          "(Figure 3).",
          "Phototransduction",
        ])
      );
      expect(await trending()).toHaveLength(5);

      // Changing a counted highlight's text to something else uncounts it.
      const { rows } = await db.query(
        "select id from highlights where selected_text = 'Phototransduction'"
      );
      await update(ALICE, rows[0].id, "selected_text = 'Visit evil.example'");
      expect(await trending()).toHaveLength(4);
    }, 60000);

    // The earliest sharer's text was shown, and a client
    // sets created_at, so one account could pick what a passage showed.
    it("shows the text most readers chose, not the earliest sharer's", async () => {
      await setup();
      const backdated = (user, start, end, text) =>
        as(user, () =>
          db.query(
            `insert into highlights (user_id, paragraph_id, start_offset, end_offset, selected_text, is_public, created_at)
             values ($1, $2, $3, $4, $5, true, '2000-01-01')`,
            [user, ids.p2, start, end, text]
          )
        );
      const shown = async () =>
        (await trending()).map(({ at, text, readers }) => ({
          at,
          text,
          readers,
        }));

      await backdated(MALLORY, 0, 17, "photon");
      await highlight(ALICE, ids.p2, 0, 17, "Rhodopsin absorbs", true);
      // One each: the text as long as the span, not a shorter word swapped
      // in at the same offsets.
      expect(await shown()).toEqual([
        { at: [0, 17], text: "Rhodopsin absorbs", readers: 2 },
      ]);

      // A second reader (a line break in her selection) outvotes it.
      await highlight(BOB, ids.p2, 0, 17, "Rhodopsin\nabsorbs", true);
      expect(await shown()).toEqual([
        { at: [0, 17], text: "Rhodopsin absorbs", readers: 3 },
      ]);

      // Text from outside the paragraph never counts, however many share it.
      await backdated(CAROL, 0, 17, "Answers at evil.example");
      await backdated(MALLORY, 0, 17, "Answers at evil.example");
      expect(await shown()).toEqual([
        { at: [0, 17], text: "Rhodopsin absorbs", readers: 3 },
      ]);

      // Same count, same length: byte order, whoever shared first.
      await highlight(ALICE, ids.p2, 20, 26, "shape.", true);
      await highlight(BOB, ids.p2, 20, 26, "photon", true);
      expect((await shown())[1]).toEqual({
        at: [20, 26],
        text: "photon",
        readers: 2,
      });
    }, 60000);

    it("hides a draft chapter's shared passage from anon and readers, not from creators", async () => {
      await setup();
      await highlight(CAROL, ids.draft, 0, 11, "UNPUBLISHED", true);
      await highlight(ALICE, ids.p2, 0, 9, "Rhodopsin", true);
      expect(await trending()).toHaveLength(2);

      const read = (user) =>
        as(user, async () =>
          (
            await db.query(
              "select selected_text from trending_highlights order by highlight_count desc limit 10"
            )
          ).rows.map((r) => r.selected_text)
        );
      expect(await read(null)).toEqual(["Rhodopsin"]);
      expect(await read(BOB)).toEqual(["Rhodopsin"]);
      expect((await read(CAROL)).sort()).toEqual(["Rhodopsin", "UNPUBLISHED"]);

      // The rule is the chapter's status at read time.
      await db.query("update modules set status = 'published'");
      expect((await read(null)).sort()).toEqual(["Rhodopsin", "UNPUBLISHED"]);
    }, 60000);

    it("keeps a shared highlight row (user, tags, note) to its owner and creators", async () => {
      await setup();
      const shared = await highlight(ALICE, ids.p2, 0, 9, "Rhodopsin", true);
      await highlight(ALICE, ids.p2, 10, 17, "absorbs", false);

      const visible = (user, sql = "select id from highlights") =>
        as(user, async () => (await db.query(sql)).rows);

      expect(await visible(null)).toEqual([]);
      expect(await visible(BOB)).toEqual([]);
      expect(
        await visible(
          BOB,
          "select h.tags, h.note, p.full_name, p.email from highlights h join profiles p on p.id = h.user_id"
        )
      ).toEqual([]);
      expect(await visible(ALICE)).toHaveLength(2);
      // Creators moderate what is shared, not what is private.
      expect(await visible(CAROL)).toEqual([{ id: shared }]);

      // Trending still shows the passage, and nothing about who shared it.
      const [row] = await as(
        null,
        async () => (await db.query("select * from trending_highlights")).rows
      );
      expect(row.selected_text).toBe("Rhodopsin");
      expect(row).not.toHaveProperty("user_id");

      // A rerun drops the old public-read policy if it came back...
      await db.exec(`CREATE POLICY "Users can view public highlights"
        ON highlights FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id)`);
      expect(await visible(null)).toHaveLength(1);
      await db.exec(sync);
      expect(await visible(null)).toEqual([]);

      // ...and fails the push on any other policy that would open the rows.
      await db.exec(
        `CREATE POLICY "Temporary: allow all" ON highlights FOR ALL USING (true)`
      );
      await expect(db.exec(sync)).rejects.toThrow(
        /another policy still lets readers see others' highlights: "Temporary: allow all" \(ALL\)/
      );
    }, 60000);

    // The self-check wanted the owner policy's qual to read
    // exactly (auth.uid() = user_id), so a production policy edited to the
    // advisor's (select auth.uid()) form failed the push, blaming another.
    it("accepts any owner policy, FOR ALL or FOR SELECT, and nothing wider", async () => {
      await setup();
      await highlight(ALICE, ids.p2, 0, 9, "Rhodopsin", true);
      const visible = (user) =>
        as(
          user,
          async () => (await db.query("select id from highlights")).rows
        );

      await db.exec(`DROP POLICY "Users manage own highlights" ON highlights;
        CREATE POLICY "Users manage own highlights" ON highlights FOR ALL
          USING (user_id = (select auth.uid()))
          WITH CHECK (user_id = (select auth.uid()))`);
      await db.exec(sync);
      expect(await visible(ALICE)).toHaveLength(1);
      expect(await visible(BOB)).toEqual([]);

      // Split per command: the SELECT one is the owner's, so it stays.
      await db.exec(`DROP POLICY "Users manage own highlights" ON highlights;
        CREATE POLICY "Read own highlights" ON highlights FOR SELECT
          USING ((SELECT auth.uid()) = user_id);
        CREATE POLICY "Write own highlights" ON highlights FOR INSERT
          WITH CHECK (auth.uid() = user_id)`);
      await db.exec(sync);
      expect(await visible(ALICE)).toHaveLength(1);
      expect(await visible(BOB)).toEqual([]);

      // The owner test plus anything else is not an owner policy.
      await db.exec(`CREATE POLICY "Own or shared" ON highlights FOR ALL
        USING (auth.uid() = user_id OR is_public)`);
      await expect(db.exec(sync)).rejects.toThrow(
        /another policy still lets readers see others' highlights: "Own or shared" \(ALL\)/
      );
      await db.exec(`DROP POLICY "Own or shared" ON highlights`);

      await db.exec(`DROP POLICY "Read own highlights" ON highlights`);
      await expect(db.exec(sync)).rejects.toThrow(
        /no owner policy .* readers would lose their own highlights/
      );
    }, 60000);

    // The frontend can be live before `supabase db push`, while the old
    // public-read policy still stands: the share switch waits for this.
    it("answers the share switch's probe for signed-in readers only", async () => {
      const probe = "select public.trending_sharing_ready() as ok";
      await setup({
        before: () => expect(db.query(probe)).rejects.toThrow(/does not exist/),
      });
      for (const user of [ALICE, CAROL])
        expect(
          await as(user, async () => (await db.query(probe)).rows)
        ).toEqual([{ ok: true }]);
      await expect(as(null, () => db.query(probe))).rejects.toThrow(
        /permission denied/
      );
      const { rows } = await db.query(
        "select prosecdef from pg_proc where oid = 'public.trending_sharing_ready'::regproc"
      );
      expect(rows).toEqual([{ prosecdef: false }]);
    }, 60000);

    it("leaves readers no way to write Trending or call the helpers", async () => {
      await setup();
      for (const user of [null, BOB]) {
        await expect(
          as(user, () =>
            db.query(
              "insert into trending_highlights (paragraph_id, selected_text, start_offset, end_offset, highlight_count) values ($1, 'x', 0, 1, 99)",
              [ids.p2]
            )
          )
        ).rejects.toThrow();
        for (const call of [
          `select public.trending_refresh_passage('${ids.p2}', 0, 9)`,
          "select public.trending_paragraph_text('{}'::jsonb)",
          "select public.trending_text_in_paragraph('x', '{}'::jsonb, 'x')",
          "select public.trending_squash('x')",
        ])
          await expect(as(user, () => db.query(call))).rejects.toThrow(
            /permission denied/
          );
      }
    }, 60000);

    it("reads a paragraph's text the way the reader renders it", async () => {
      await setup();
      const { document } = new Window();
      const shownText = (blocks) => {
        const el = document.createElement("div");
        el.innerHTML = contentBlocksToHTML(blocks).text;
        return el.textContent;
      };
      const sqlText = async (blocks) =>
        (
          await db.query("select public.trending_paragraph_text($1) as t", [
            { blocks },
          ])
        ).rows[0].t;
      const counts = async (selected, blocks) =>
        (
          await db.query(
            "select public.trending_text_in_paragraph($1, $2, null) as ok",
            [selected, { blocks }]
          )
        ).rows[0].ok;

      const inline = [
        P1_BLOCKS,
        [
          {
            type: "text",
            content:
              "A **bold** claim&mdash;with &lt;tags&gt; &amp; a&nbsp;space",
          },
          { type: "citation_ref", number: 4 },
          { type: "figure_placeholder" },
          { type: "something_new", content: " fallback content" },
          null,
          { type: "citation_ref", number: 9 },
          { type: "image", src: "/a.png", alt: "not text" },
          { type: "widget", widgetId: "sdt" },
        ],
      ];
      const blockLevel = [
        { type: "heading", level: 3, content: "Rods &amp; cones" },
        { type: "text", content: "A line<br>break" },
        { type: "list", items: ["first <em>item</em>", "second"] },
        { type: "blockquote", content: "Quoted &quot;words&quot;" },
        { type: "code", content: "x = 1" },
      ];

      // Same characters as the reader's textContent (block boundaries aside).
      for (const blocks of [...inline, blockLevel])
        expect((await sqlText(blocks)).replace(/\s+/g, "")).toBe(
          shownText(blocks).replace(/\s+/g, "")
        );

      // Inside running text, any run of words a reader selects counts.
      for (const blocks of inline) {
        const words = shownText(blocks).trim().split(/\s+/);
        for (let i = 0; i < words.length; i++) {
          const selected = words.slice(i, i + 3).join(" ");
          expect(await counts(selected, blocks), selected).toBe(true);
        }
      }

      // Across block boundaries a browser selection has a line break.
      for (const selected of [
        "Rods & cones\nA line\nbreak",
        "break\n\nfirst item\nsecond",
        'Quoted "words"\n\nx = 1',
      ])
        expect(await counts(selected, blockLevel), selected).toBe(true);
      expect(await counts("Rods & conesA line", blockLevel)).toBe(false);
    }, 60000);
  }
);
