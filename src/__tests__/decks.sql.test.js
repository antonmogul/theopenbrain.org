// @vitest-environment node
/** Isolated execution test for 20261007010000_decks.sql and its generated
 * seed, 20261007010100_seed_funding_deck.sql (OPENBRAIN-129). Run with
 *   HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npx vitest run \
 *     --pool=forks src/__tests__/decks.sql.test.js
 * It skips when that variable is absent, like the other *.sql.test.js files.
 *
 * It applies the REAL migrations the decks migration depends on (the initial
 * schema without its two CREATE EXTENSION lines, which nothing here uses, for
 * profiles and modules; the RLS lockdown, for public.is_creator()), then the
 * decks migration (whose closing DO block checks itself) and the seed, on the
 * same small Supabase stand-in as trendingHighlightsSync.sql.test.js: the
 * anon and authenticated roles, auth.users, auth.uid() read from
 * request.jwt.claim.sub, and Supabase's default grants. Each request runs
 * under SET ROLE with that claim, so RLS, the grants and SECURITY DEFINER
 * behave as they do behind PostgREST. Not modelled: PostgREST itself (the
 * HTTP status an error becomes), concurrent writers and production data.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = (name) =>
  readFileSync(`supabase/migrations/${name}.sql`, "utf8");
const decks = migration("20261007010000_decks");
const seed = migration("20261007010100_seed_funding_deck");
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

const CAROL = "00000000-0000-0000-0000-00000000000c"; // creator
const BOB = "00000000-0000-0000-0000-00000000000b"; // student
const PAT = "00000000-0000-0000-0000-00000000000e"; // professor

const slide = (id, extra = {}) => ({
  id,
  label: id,
  notes: `Notes for ${id}`,
  layout: "section",
  props: { title: id },
  ...extra,
});

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
    [PAT, "professor"],
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
  await db.exec(decks);
  await db.exec(seed);
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

const q = (user, sql, params) =>
  as(user, async () => (await db.query(sql, params)).rows);

// A deck made by the creator, as the editor's POST does.
async function createDeck(slug, slides, extra = "") {
  const [row] = await q(
    CAROL,
    `insert into decks (slug, title, slides${extra ? `, ${extra}` : ""})
     values ($1, $2, $3::jsonb${extra ? ", 'pitch'" : ""}) returning *`,
    [slug, `Deck ${slug}`, JSON.stringify(slides)]
  );
  return row;
}

// The editor's compare-and-swap save: rows changed.
const save = (user, id, version, slides) =>
  q(
    user,
    `update decks set slides = $3::jsonb, version = $2 + 1
      where id = $1 and version = $2 returning id, version`,
    [id, version, JSON.stringify(slides)]
  );

const publish = (user, id, version) =>
  q(user, "select * from public.publish_deck($1, $2)", [id, version]);
const pinned = (user) =>
  q(user, "select public.get_pinned_deck() as deck").then((r) => r[0].deck);
const shared = (user, token) =>
  q(user, "select public.get_shared_deck($1) as deck", [token]).then(
    (r) => r[0].deck
  );
// As the owner, past RLS: what the table holds.
const owner = async (sql, params) => (await db.query(sql, params)).rows;

describe.skipIf(!harness)("decks (OPENBRAIN-129) in isolated PGlite", () => {
  it("applies with its self-check, seeds the funding deck once, and reapplies", async () => {
    await setup();
    const [funding] = await owner(
      "select slug, title, kind, status, pinned, version, published_version, slide_count, created_by, slides = published_slides as same from decks"
    );
    expect(funding).toEqual({
      slug: "funding",
      title: "The Open Brain — Funding deck",
      kind: "funding",
      status: "published",
      pinned: true,
      version: 1,
      published_version: 1,
      slide_count: 9,
      created_by: null,
      same: true,
    });
    expect(await owner("select version, note from deck_revisions")).toEqual([
      { version: 1, note: "Seeded from src/data/decks/funding.js" },
    ]);

    // A creator edits the deck; rerunning both files changes nothing.
    const [{ id }] = await owner("select id from decks");
    expect(await save(CAROL, id, 1, [slide("edited")])).toHaveLength(1);
    await db.exec(decks);
    await db.exec(seed);
    expect(
      await owner("select slides->0->>'id' as first, version from decks")
    ).toEqual([{ first: "edited", version: 2 }]);
    expect(
      await owner("select count(*)::int as n from deck_revisions")
    ).toEqual([{ n: 1 }]);

    // With the funding deck gone and another deck pinned, the seed still
    // applies (and doesn't take /deck back).
    const other = await createDeck("other", [slide("a")]);
    await publish(CAROL, other.id, 1);
    await q(CAROL, "select public.set_pinned_deck($1)", [other.id]);
    await owner("delete from decks where slug = 'funding'");
    await db.exec(seed);
    expect(await owner("select slug, pinned from decks order by slug")).toEqual(
      [
        { slug: "funding", pinned: false },
        { slug: "other", pinned: true },
      ]
    );
  }, 60000);

  it("keeps anon off the tables and the creator functions", async () => {
    await setup();
    for (const sql of [
      "select * from decks",
      "select * from deck_revisions",
      "insert into decks (slug, title) values ('x', 'X')",
      "update decks set title = 'X'",
      "delete from decks",
      "select public.publish_deck(gen_random_uuid(), 1)",
      "select public.set_pinned_deck(null)",
      "select public.discard_deck_changes(gen_random_uuid(), 1)",
      "select public.deck_public_slides('[]'::jsonb, true)",
    ])
      await expect(q(null, sql), sql).rejects.toThrow(/permission denied/);
    // Signed-in readers can't call the helper either.
    await expect(
      q(BOB, "select public.deck_public_slides('[]'::jsonb, true)")
    ).rejects.toThrow(/permission denied/);
  }, 60000);

  it("gives readers and professors nothing to read and nothing to write", async () => {
    await setup();
    const [{ id }] = await owner("select id from decks");
    for (const user of [BOB, PAT]) {
      expect(await q(user, "select * from decks")).toEqual([]);
      expect(await q(user, "select * from deck_revisions")).toEqual([]);
      await expect(
        q(user, "insert into decks (slug, title) values ('mine', 'Mine')")
      ).rejects.toThrow(/row-level security/);
      await expect(
        q(
          user,
          "insert into deck_revisions (deck_id, version, title, slides) values ($1, 9, 'x', '[]')",
          [id]
        )
      ).rejects.toThrow(/row-level security/);
      expect(await save(user, id, 1, [slide("x")])).toEqual([]);
      expect(await q(user, "delete from decks returning id")).toEqual([]);
      await expect(publish(user, id, 1)).rejects.toThrow(
        /Only creators can publish/
      );
      await expect(
        q(user, "select public.set_pinned_deck(null)")
      ).rejects.toThrow(/Only creators can change \/deck/);
      await expect(
        q(user, "select * from public.discard_deck_changes($1, 1)", [id])
      ).rejects.toThrow(/Only creators can discard/);
    }
    expect(
      await owner("select version, slides->0->>'id' as first from decks")
    ).toEqual([{ version: 1, first: "intro" }]);
  }, 60000);

  it("lets a creator save with a version compare-and-swap", async () => {
    await setup();
    const deck = await createDeck("pitch-2026", [slide("a")]);
    expect(deck).toMatchObject({
      status: "draft",
      version: 1,
      pinned: false,
      created_by: CAROL,
      slide_count: 1,
      published_slides: null,
    });
    expect(deck.share_token).toMatch(/^[0-9a-f]{32}$/);

    expect(await save(CAROL, deck.id, 1, [slide("a"), slide("b")])).toEqual([
      { id: deck.id, version: 2 },
    ]);
    // A tab still on version 1 changes nothing: zero rows.
    expect(await save(CAROL, deck.id, 1, [slide("stale")])).toEqual([]);
    const [row] = await q(
      CAROL,
      "select version, slide_count, updated_by, updated_at > created_at as touched from decks where id = $1",
      [deck.id]
    );
    expect(row).toEqual({
      version: 2,
      slide_count: 2,
      updated_by: CAROL,
      touched: true,
    });
  }, 60000);

  it("publishes a snapshot with a revision row, and refuses a stale version", async () => {
    await setup();
    const deck = await createDeck("talk", [slide("a")]);
    await save(CAROL, deck.id, 1, [slide("a"), slide("b")]);

    await expect(publish(CAROL, deck.id, 1)).rejects.toThrow(/deck_conflict/);
    expect(
      await owner("select status from decks where id = $1", [deck.id])
    ).toEqual([{ status: "draft" }]);

    const [published] = await publish(CAROL, deck.id, 2);
    expect(published).toMatchObject({
      status: "published",
      version: 2,
      published_version: 2,
      published_title: "Deck talk",
      published_by: CAROL,
    });
    expect(published.published_slides.map((s) => s.id)).toEqual(["a", "b"]);
    expect(
      await q(
        CAROL,
        "select version, note, created_by, jsonb_array_length(slides) as n from deck_revisions where deck_id = $1",
        [deck.id]
      )
    ).toEqual([{ version: 2, note: "Published", created_by: CAROL, n: 2 }]);

    // Later edits stay private until the next publish.
    await save(CAROL, deck.id, 2, [slide("draft-only")]);
    const link = await shared(null, published.share_token);
    expect(link.slides.map((s) => s.id)).toEqual(["a", "b"]);
    // Revisions are immutable, even for creators.
    expect(
      await q(CAROL, "update deck_revisions set note = 'x' returning id")
    ).toEqual([]);
  }, 60000);

  it("serves /deck: the seeded deck without notes for anon, with them for creators", async () => {
    await setup();
    const forAnon = await pinned(null);
    expect(forAnon).toMatchObject({
      title: "The Open Brain — Funding deck",
      kind: "funding",
    });
    // The slug is the creators' name for the deck: only they get it.
    expect(forAnon.slug).toBeNull();
    expect((await pinned(BOB)).slug).toBeNull();
    expect((await pinned(CAROL)).slug).toBe("funding");
    expect(forAnon.slides).toHaveLength(9);
    expect(forAnon.slides.map((s) => s.id)[0]).toBe("intro");
    expect(forAnon.slides.some((s) => "notes" in s)).toBe(false);
    expect((await pinned(BOB)).slides.some((s) => "notes" in s)).toBe(false);
    expect((await pinned(CAROL)).slides.every((s) => s.notes)).toBe(true);

    // Hidden slides are dropped, for everyone.
    const [{ id }] = await owner("select id from decks");
    await save(CAROL, id, 1, [
      slide("a"),
      slide("b", { hidden: true }),
      slide("c", { hidden: false }),
    ]);
    await publish(CAROL, id, 2);
    expect((await pinned(null)).slides).toEqual([
      { id: "a", label: "a", layout: "section", props: { title: "a" } },
      {
        id: "c",
        label: "c",
        layout: "section",
        props: { title: "c" },
        hidden: false,
      },
    ]);
    expect((await pinned(CAROL)).slides.map((s) => s.id)).toEqual(["a", "c"]);

    // Unpublished: /deck has nothing (the page falls back to its bundle).
    await q(CAROL, "update decks set status = 'draft' where id = $1", [id]);
    expect(await pinned(null)).toBeNull();
  }, 60000);

  it("serves share links only for a published deck and its current token", async () => {
    await setup();
    const [{ id, share_token: token }] = await owner(
      "select id, share_token from decks"
    );
    const deck = await shared(null, token);
    expect(deck.slides).toHaveLength(9);
    expect(deck.slides.some((s) => "notes" in s)).toBe(false);
    expect(deck.slug).toBeNull();
    expect((await shared(BOB, token)).slug).toBeNull();
    expect((await shared(CAROL, token)).slides[0].notes).toBeTruthy();
    expect((await shared(CAROL, token)).slug).toBe("funding");

    for (const bad of ["", "nope", token.toUpperCase(), `${token}0`, "%"])
      expect(await shared(null, bad), bad).toBeNull();

    // A new link: the old one stops working.
    const [{ share_token: rotated }] = await q(
      CAROL,
      "update decks set share_token = replace(gen_random_uuid()::text, '-', '') where id = $1 returning share_token",
      [id]
    );
    expect(await shared(null, token)).toBeNull();
    expect((await shared(null, rotated)).title).toBe(
      "The Open Brain — Funding deck"
    );
    expect((await shared(CAROL, rotated)).slug).toBe("funding");

    // Unpublished or archived: no deck, same link back on republish.
    await q(CAROL, "update decks set status = 'draft' where id = $1", [id]);
    expect(await shared(null, rotated)).toBeNull();
    await q(CAROL, "update decks set status = 'archived' where id = $1", [id]);
    expect(await shared(null, rotated)).toBeNull();
    await publish(CAROL, id, 1);
    expect((await shared(null, rotated)).slides).toHaveLength(9);

    // A token must be 32 lowercase hex digits.
    await expect(
      q(CAROL, "update decks set share_token = 'short' where id = $1", [id])
    ).rejects.toThrow(/share_token_check/);
  }, 60000);

  it("discards unpublished changes from the row's own snapshot", async () => {
    await setup();
    const deck = await createDeck("pitch", [slide("p0")]);
    await publish(CAROL, deck.id, 1);
    await save(CAROL, deck.id, 1, [slide("w2"), slide("w2b")]);
    // Tab B loads here: version 2, snapshot p0, "unpublished changes".
    // Tab A then publishes version 2, which leaves the version at 2.
    await publish(CAROL, deck.id, 2);
    // Tab B discards at version 2: the working copy becomes what funders see
    // now (w2), not the p0 snapshot B loaded, in sync at version 3.
    const [row] = await q(
      CAROL,
      "select * from public.discard_deck_changes($1, 2)",
      [deck.id]
    );
    expect(row).toMatchObject({ version: 3, published_version: 3 });
    expect(row.slides.map((s) => s.id)).toEqual(["w2", "w2b"]);
    expect(row.slides).toEqual(row.published_slides);
    expect((await shared(null, row.share_token)).slides).toHaveLength(2);

    // A tab on an older version gets a conflict and changes nothing.
    await expect(
      q(CAROL, "select * from public.discard_deck_changes($1, 2)", [deck.id])
    ).rejects.toThrow(/deck_conflict/);
    expect(
      await owner("select version from decks where id = $1", [deck.id])
    ).toEqual([{ version: 3 }]);

    // A deck that was never published has nothing to go back to.
    const draft = await createDeck("never", [slide("n")]);
    await expect(
      q(CAROL, "select * from public.discard_deck_changes($1, 1)", [draft.id])
    ).rejects.toThrow(/deck_conflict/);

    // The published title comes back with the slides.
    await q(CAROL, "update decks set title = 'Renamed' where id = $1", [
      deck.id,
    ]);
    const [again] = await q(
      CAROL,
      "select * from public.discard_deck_changes($1, 3)",
      [deck.id]
    );
    expect(again).toMatchObject({ title: "Deck pitch", version: 4 });
  }, 60000);

  it("keeps a single deck at /deck", async () => {
    await setup();
    const [{ id: funding }] = await owner("select id from decks");
    const draft = await createDeck("next", [slide("n")]);

    await expect(
      q(CAROL, "select public.set_pinned_deck($1)", [draft.id])
    ).rejects.toThrow(/deck_not_published/);
    expect((await pinned(CAROL)).slug).toBe("funding");

    await publish(CAROL, draft.id, 1);
    await q(CAROL, "select public.set_pinned_deck($1)", [draft.id]);
    expect(
      await owner("select slug from decks where pinned order by slug")
    ).toEqual([{ slug: "next" }]);
    expect((await pinned(CAROL)).slug).toBe("next");
    expect((await pinned(null)).title).toBe("Deck next");

    // Pinning the pinned deck again is fine.
    await q(CAROL, "select public.set_pinned_deck($1)", [draft.id]);
    expect(
      await owner("select count(*)::int as n from decks where pinned")
    ).toEqual([{ n: 1 }]);

    // Two pinned rows can't exist, however they're written.
    await expect(
      q(CAROL, "update decks set pinned = true where id = $1", [funding])
    ).rejects.toThrow(/decks_one_pinned_idx/);

    await q(CAROL, "select public.set_pinned_deck(null)");
    expect(
      await owner("select count(*)::int as n from decks where pinned")
    ).toEqual([{ n: 0 }]);
    expect(await pinned(null)).toBeNull();
  }, 60000);

  it("refuses reserved or malformed slugs", async () => {
    await setup();
    for (const slug of [
      "new",
      "present",
      "s",
      "templates",
      "Bad Slug",
      "-x",
      "",
    ])
      await expect(createDeck(slug, []), slug).rejects.toThrow(
        /decks_slug_check/
      );
    await expect(createDeck("funding", [])).rejects.toThrow(/duplicate key/);
    await expect(createDeck("s-2", [])).resolves.toMatchObject({ slug: "s-2" });
    await expect(
      q(CAROL, "insert into decks (slug, title) values ('blank', '   ')")
    ).rejects.toThrow(/decks_title_check/);
  }, 60000);

  it("checks the slides are an array of at most 100 entries and 1 MB", async () => {
    await setup();
    const deck = await createDeck("sized", []);
    const set = (value) =>
      q(CAROL, "update decks set slides = $2::jsonb where id = $1", [
        deck.id,
        value,
      ]);
    for (const notArray of ['{"id": "a"}', '"slides"', "null", "1"])
      await expect(set(notArray), notArray).rejects.toThrow(
        /decks_slides_check|null value/
      );
    const many = (n) =>
      JSON.stringify(Array.from({ length: n }, (_, i) => slide(`s${i}`)));
    await expect(set(many(100))).resolves.toEqual([]);
    await expect(set(many(101))).rejects.toThrow(/decks_slides_check/);
    await expect(
      set(JSON.stringify([slide("big", { notes: "x".repeat(1048576) })]))
    ).rejects.toThrow(/decks_slides_check/);
    // Published snapshots have the same size limit and must be arrays.
    await expect(
      q(
        CAROL,
        `update decks set published_slides = '{"a": 1}'::jsonb where id = $1`,
        [deck.id]
      )
    ).rejects.toThrow(/published_slides_check/);
    // A published deck always has a snapshot.
    await expect(
      q(CAROL, "update decks set status = 'published' where id = $1", [deck.id])
    ).rejects.toThrow(/decks_published_has_snapshot/);
  }, 60000);

  it("deletes a deck's revisions with it", async () => {
    await setup();
    const deck = await createDeck("gone", [slide("a")]);
    await publish(CAROL, deck.id, 1);
    expect(
      await q(CAROL, "delete from decks where id = $1 returning id", [deck.id])
    ).toHaveLength(1);
    expect(
      await owner(
        "select count(*)::int as n from deck_revisions where deck_id = $1",
        [deck.id]
      )
    ).toEqual([{ n: 0 }]);
  }, 60000);

  it("fails the push if a later change opens the tables to anon", async () => {
    await setup();
    await db.exec("grant select on public.decks to anon");
    await expect(db.exec(decks)).resolves.toBeDefined();
    // The migration revokes it again on rerun; a policy for anon is caught.
    await db.exec(
      `create policy "decks: anyone" on public.decks for select to anon using (true)`
    );
    await expect(db.exec(decks)).rejects.toThrow(/policies reach anon\/public/);
  }, 60000);
});
