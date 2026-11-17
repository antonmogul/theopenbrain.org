// @vitest-environment node
/** History's figures count in reading order (OPENBRAIN-193), and
 * 20261117193100_history_figure_numbering.sql is what makes them.
 * The fixture half always runs. The SQL half runs the migration in PGlite:
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyFigureNumbering.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261117193100_history_figure_numbering.sql",
  "utf8"
);
const fixture = JSON.parse(
  readFileSync("src/stories/historyFullReaderData.json", "utf8")
);

/* ---- What the migration says, read from the file itself ---------------- */

// ('animationFoundationsFig5', '5', '7')  /  (…, null, '"L"')
const FIGURES = [
  ...sql.matchAll(
    /\('(animationFoundations\w+)',\s+(null|'[^']*'),\s+'([^']*)'\)/g
  ),
].map(([, key, was, now]) => ({
  key,
  was: was === "null" ? undefined : JSON.parse(was.slice(1, -1)),
  now: JSON.parse(now),
}));
// ('98a7f0f4-…', '[1]'),  -- where-is-my-mind ¶0
const CITING = [
  ...sql.matchAll(
    /\('([0-9a-f-]{36})', '(\[[^\]]*\])'\),?\s+-- ([\w-]+) ¶(\d+)/g
  ),
].map(([, uuid, cites, slug, order]) => ({
  uuid,
  was: JSON.parse(cites),
  fixtureId: `history-section-${slug}-p${order}`,
}));
const RENUMBER = JSON.parse(
  /renumber constant jsonb := '([^']+)'/.exec(sql)[1]
);
const BACK = Object.fromEntries(
  Object.entries(RENUMBER).map(([was, now]) => [
    String(now),
    /^\d+$/.test(was) ? Number(was) : was,
  ])
);

/* ---- The chapter in reading order -------------------------------------- */

const byOrder = (a, b) => a.order_index - b.order_index;
const figureOf = new Map(fixture.animations.map((a) => [a.id, a]));
const paragraphsOf = (section) =>
  fixture.paragraphs.filter((p) => p.section_id === section.id).sort(byOrder);
const placeholders = (paragraph) =>
  (paragraph.content?.blocks || [])
    .filter((b) => b.type === "figure_placeholder")
    .map((b) => b.number);

/** Every paragraph as a reader meets it: a box after the paragraph it is
 *  anchored to (placeBoxes). `box` says which series its figure is in. */
function readingOrder(data = fixture) {
  const out = [];
  const boxes = data.sections.filter((s) => s.parent_section_id);
  for (const section of data.sections
    .filter((s) => !s.parent_section_id)
    .sort(byOrder)) {
    for (const p of paragraphsOf(section)) {
      out.push({ paragraph: p, box: false });
      for (const box of boxes.filter((b) => b.anchor_paragraph_id === p.id))
        for (const bp of paragraphsOf(box))
          out.push({ paragraph: bp, box: true });
    }
  }
  return out;
}
const labelsIn = (order, box) =>
  order
    .filter((e) => e.box === box && e.paragraph.animation_id)
    .map((e) => figureOf.get(e.paragraph.animation_id).config.figureNumber);

describe("History figure numbers (fixture)", () => {
  const order = readingOrder();

  it("reads every paragraph of the chapter, boxes in their place", () => {
    expect(order).toHaveLength(fixture.paragraphs.length);
    expect(fixture.sections.filter((s) => s.parent_section_id)).toHaveLength(7);
  });

  // Stuart, 14 Nov: "the first fig (Lorenz fries) is not numbered, so the
  // next fig (trepanned skull) is labelled fig 1 but it's actually fig 2".
  it("counts the figures beside the text 1 to 26, none skipped, none unnumbered", () => {
    expect(labelsIn(order, false)).toEqual(
      Array.from({ length: 26 }, (_, i) => i + 1)
    );
    const first = order.find((e) => e.paragraph.animation_id);
    expect(figureOf.get(first.paragraph.animation_id).animation_key).toBe(
      "animationFoundationsIntroWoodcut"
    );
    expect(
      fixture.animations.find(
        (a) => a.animation_key === "animationFoundationsFig1"
      ).config.figureNumber
    ).toBe(2);
  });

  it("letters the breakout boxes' figures A to M in reading order", () => {
    // E is the second picture of Figure D (the piece of skull in Lund),
    // cited in the text by its own letter, so no record carries it.
    expect(labelsIn(order, true)).toEqual([..."ABCDFGHIJKLM"]);
  });

  it("cites, in each paragraph, the figure that hangs beside it", () => {
    const cited = [];
    for (const { paragraph } of order) {
      const cites = placeholders(paragraph);
      if (!cites.length) continue;
      const own = figureOf.get(paragraph.animation_id)?.config.figureNumber;
      expect(cites, paragraph.id).toContain(own);
      cited.push(...cites);
    }
    // In the order they are read, the citations never go backwards within
    // a series, and each is a figure that exists.
    const labels = new Set([
      ...fixture.animations.map((a) => a.config.figureNumber),
      "E",
    ]);
    for (const c of cited) expect(labels.has(c), `Figure ${c}`).toBe(true);
    const numbers = cited.filter((c) => typeof c === "number");
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    const letters = cited.filter((c) => typeof c === "string");
    expect(letters).toEqual([...letters].sort());
  });

  it("says Figures I and J in the Penfield box, and its captions agree", () => {
    const text = JSON.stringify(
      fixture.paragraphs.filter(
        (p) => p.section_id === "history-section-box-penfield"
      )
    );
    expect(text.match(/<strong>Figures I and J<\/strong>/g)).toHaveLength(2);
    expect(text).not.toContain("Figures H and I");
    const caption = (key) =>
      fixture.animations.find((a) => a.animation_key === key).config.caption;
    const operative = caption("animationFoundationsPenfieldOperative");
    expect(operative).toMatch(/^Figure I\. Operative photo/);
    expect(operative).toContain("See Figure J for results");
    expect(caption("animationFoundationsPenfieldMap")).toMatch(
      /^Figure J\. Penfield's map/
    );
    // The map's own site letters are not figure letters.
    expect(caption("animationFoundationsPenfieldMap")).toContain(
      "stimulation at H produced sensation in the leg"
    );
  });

  it("is what the migration writes: every figure, every citing paragraph", () => {
    expect(FIGURES).toHaveLength(fixture.animations.length);
    for (const { key, was, now } of FIGURES) {
      const row = fixture.animations.find((a) => a.animation_key === key);
      expect(row.config.figureNumber, key).toBe(now);
      expect(was, key).not.toBe(now);
    }
    const citing = fixture.paragraphs.filter((p) => placeholders(p).length);
    expect(CITING.map((c) => c.fixtureId).sort()).toEqual(
      citing.map((p) => p.id).sort()
    );
    for (const { fixtureId, was } of CITING) {
      const row = fixture.paragraphs.find((p) => p.id === fixtureId);
      expect(placeholders(row), fixtureId).toEqual(
        was.map((n) => RENUMBER[String(n)])
      );
    }
  });
});

/* ---- The migration, run ------------------------------------------------ */

const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique);
create table public.sections (id uuid primary key default gen_random_uuid(), module_id uuid, slug text);
create table public.paragraphs (id uuid primary key default gen_random_uuid(), section_id uuid,
  fixture_id text, content jsonb, content_text text, updated_at timestamptz default '2026-11-01');
create table public.animations (id uuid primary key default gen_random_uuid(), animation_key text unique not null,
  config jsonb, updated_at timestamptz default '2026-11-01');
`;

/** The fixture as it was before the migration: the numbers put back. */
function before() {
  const was = new Map(FIGURES.map((f) => [f.key, f.was]));
  const animations = fixture.animations.map((a) => {
    const config = structuredClone(a.config);
    if (was.get(a.animation_key) === undefined) delete config.figureNumber;
    else config.figureNumber = was.get(a.animation_key);
    if (a.animation_key === "animationFoundationsPenfieldOperative")
      config.caption = config.caption
        .replace("Figure I. Operative photo", "Figure H. Operative photo")
        .replace("See Figure J for results", "See Figure H for results");
    if (a.animation_key === "animationFoundationsPenfieldMap")
      config.caption = config.caption.replace(
        "Figure J. Penfield's map",
        "Figure I. Penfield's map"
      );
    return { key: a.animation_key, config };
  });
  const uuidOf = new Map(CITING.map((c) => [c.fixtureId, c.uuid]));
  const paragraphs = fixture.paragraphs.map((p) => {
    let content = structuredClone(p.content);
    let text = p.content_text;
    for (const block of content.blocks || [])
      if (block.type === "figure_placeholder") {
        // "Figure 4" back to "Figure 3": the § keeps a number already put
        // back from being put back again.
        text = text?.replace(
          new RegExp(`Figure ${block.number}\\b`, "g"),
          `Figure §${BACK[String(block.number)]}`
        );
        block.number = BACK[String(block.number)];
      }
    text = text?.replaceAll("Figure §", "Figure ");
    content = JSON.parse(
      JSON.stringify(content).replaceAll("Figures I and J", "Figures H and I")
    );
    text = text?.replaceAll("Figures I and J", "Figures H and I");
    return {
      uuid: uuidOf.get(p.id) || null,
      fixtureId: p.id,
      section: p.section_id,
      content,
      text: text ?? null,
    };
  });
  return { animations, paragraphs };
}

async function seeded(PGlite, { module = true } = {}) {
  const db = new PGlite();
  await db.exec(schema);
  const start = before();
  if (!module) return { db, start };
  const {
    rows: [{ id: moduleId }],
  } = await db.query(
    "insert into modules(slug) values ('foundations-of-neuroscience') returning id"
  );
  const sectionId = new Map();
  for (const s of fixture.sections) {
    const { rows } = await db.query(
      "insert into sections(module_id, slug) values ($1, $2) returning id",
      [moduleId, s.slug]
    );
    sectionId.set(s.id, rows[0].id);
  }
  for (const a of start.animations)
    await db.query(
      "insert into animations(animation_key, config) values ($1, $2)",
      [a.key, JSON.stringify(a.config)]
    );
  for (const p of start.paragraphs)
    await db.query(
      `insert into paragraphs(id, section_id, fixture_id, content, content_text)
       values (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5)`,
      [
        p.uuid,
        sectionId.get(p.section),
        p.fixtureId,
        JSON.stringify(p.content),
        p.text,
      ]
    );
  return { db, start };
}
const state = async (db) => ({
  animations: (
    await db.query(
      "select animation_key k, config c, updated_at u from animations order by 1"
    )
  ).rows,
  paragraphs: (
    await db.query(
      "select fixture_id f, content c, content_text t, updated_at u from paragraphs order by 1"
    )
  ).rows,
});

describe.skipIf(!harness || !existsSync(harness))(
  "History figure numbers (SQL)",
  () => {
    it("starts from the manuscript's numbers", () => {
      const start = before();
      const number = (key) =>
        start.animations.find((a) => a.key === key).config.figureNumber;
      expect(number("animationFoundationsIntroWoodcut")).toBeUndefined();
      expect(number("animationFoundationsFig1")).toBe(1);
      expect(number("animationFoundationsFigK")).toBe("K");
      const papyrus = start.paragraphs.find(
        (p) => p.fixtureId === "history-section-where-is-my-mind-p3"
      );
      expect(placeholders(papyrus)).toEqual([3, 4]);
      expect(papyrus.text).toContain("(Figure 3)");
      expect(papyrus.text).toContain("(Figure 4)");
    });

    it("turns the chapter as it was into the fixture, and runs twice", async () => {
      const { PGlite } = require(harness);
      const { db } = await seeded(PGlite);
      await db.exec(sql);
      const first = await state(db);
      for (const row of first.animations) {
        const want = fixture.animations.find((a) => a.animation_key === row.k);
        expect(row.c, row.k).toEqual(want.config);
      }
      for (const row of first.paragraphs) {
        const want = fixture.paragraphs.find((p) => p.id === row.f);
        expect(row.c, row.f).toEqual(want.content);
        expect(row.t, row.f).toBe(want.content_text);
      }
      // Only what it had to touch: 38 figures, 28 citing paragraphs and
      // the Penfield paragraph that only says "Figures H and I".
      const touched = (rows) =>
        rows.filter((r) => r.u > new Date("2026-11-02")).length;
      expect(touched(first.animations)).toBe(38);
      expect(touched(first.paragraphs)).toBe(29);
      await db.exec(sql);
      // The second run finds nothing to change.
      expect(await state(db)).toEqual(first);
    });

    it("leaves alone a figure or a paragraph an author has since changed", async () => {
      const { PGlite } = require(harness);
      const { db } = await seeded(PGlite);
      // Someone numbered the woodcut by hand, and re-cited the skull.
      await db.exec(`
        update animations set config = config || '{"figureNumber": "0"}'
         where animation_key = 'animationFoundationsIntroWoodcut';
        update paragraphs set content = replace(content::text,
          '{"type": "figure_placeholder", "number": 1}',
          '{"type": "figure_placeholder", "number": 99}')::jsonb
         where fixture_id = 'history-section-where-is-my-mind-p0';
        update animations set config = jsonb_set(config, '{caption}', '"Rewritten."')
         where animation_key = 'animationFoundationsPenfieldMap';
      `);
      await db.exec(sql);
      const after = await state(db);
      const figure = (k) => after.animations.find((a) => a.k === k).c;
      expect(figure("animationFoundationsIntroWoodcut").figureNumber).toBe("0");
      expect(figure("animationFoundationsFig1").figureNumber).toBe(2);
      // Its number moves; its rewritten caption does not.
      expect(figure("animationFoundationsPenfieldMap")).toMatchObject({
        figureNumber: "J",
        caption: "Rewritten.",
      });
      const skull = after.paragraphs.find(
        (p) => p.f === "history-section-where-is-my-mind-p0"
      );
      expect(placeholders({ content: skull.c })).toEqual([99]);
      expect(skull.t).toContain("(Figure 1)");
      expect(skull.u).toEqual(new Date("2026-11-01"));
    });

    it("finds nothing to do without the chapter", async () => {
      const { PGlite } = require(harness);
      const { db } = await seeded(PGlite, { module: false });
      await db.exec(
        `insert into animations(animation_key, config) values ('animationFoundationsFig1', '{"figureNumber": 1}')`
      );
      await db.exec(sql);
      const { rows } = await db.query("select config c from animations");
      expect(rows[0].c).toEqual({ figureNumber: 1 });
    });
  }
);
