// @vitest-environment node
/** Runs 20261117193000_history_reference_fixes.sql in PGlite (OPENBRAIN-193).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyReferenceFixes.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chapterBackReferences,
  referenceDisplay,
} from "@/helper/chapterReferences";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261117193000_history_reference_fixes.sql",
  "utf8"
);
const fixture = JSON.parse(
  readFileSync("src/stories/historyFullReaderData.json", "utf8")
);

// As the two entries read until 17 Nov 2026.
const WAS = {
  98: {
    journal: "Allgemeine Zeitschift fu»r Psychiatrie",
    raw_text:
      "Burckhardt, G. Über Rindenexzisionen als Beitrag zur operativen Therapie der Psychosen. <em>Allgemeine Zeitschift fu»r Psychiatrie</em> 463–548 (1891).",
  },
  111: {
    authors:
      "The Mind Mappers by Eric Andrew-Gee \\| Penguin Random House Canada",
    title:
      "The Mind Mappers by Eric Andrew-Gee \\| Penguin Random House Canada. https://www.penguinrandomhouse.ca/books/726132/the-mind-mappers-by-eric-andrew-gee/9781039008069.",
    pub_type: "web",
    raw_text:
      "The Mind Mappers by Eric Andrew-Gee \\| Penguin Random House Canada. https://www.penguinrandomhouse.ca/books/726132/the-mind-mappers-by-eric-andrew-gee/9781039008069.",
  },
};
const NOW = {
  98: "Burckhardt, G. Über Rindenexzisionen als Beitrag zur operativen Therapie der Psychosen. <em>Allgemeine Zeitschrift für Psychiatrie</em> 463–548 (1891).",
  111: "Andrew-Gee, E. <em>The Mind Mappers</em>. (Penguin Random House Canada).",
};
const row = (number) => fixture.references.find((r) => r.number === number);
const listParagraph = () =>
  fixture.paragraphs.find((p) => p.section_id === "history-section-references");

describe("History references 98 and 111 (fixture)", () => {
  // Stuart, 14 Nov: "Change to 'fur' and the author of the book is Eric
  // Andrew-Gee and the publisher Penguin".
  it("spells Zeitschrift für, in the row and in the section's list", () => {
    expect(row(98).journal).toBe("Allgemeine Zeitschrift für Psychiatrie");
    expect(row(98).raw_text).toBe(NOW[98]);
    expect(listParagraph().content.blocks[0].items[97]).toBe(NOW[98]);
  });

  it("cites The Mind Mappers as a book by Andrew-Gee, like its neighbours", () => {
    expect(row(111)).toMatchObject({
      authors: "Andrew-Gee, E",
      title: "The Mind Mappers",
      journal: null,
      pub_type: "book",
      raw_text: NOW[111],
      url: "https://www.penguinrandomhouse.ca/books/726132/the-mind-mappers-by-eric-andrew-gee/9781039008069",
    });
    expect(listParagraph().content.blocks[0].items[110]).toBe(NOW[111]);
    // The same shape as the list's other books (8, 25, 117).
    const book = /^[^<]+\. <em>[^<]+<\/em>\. \([^)]+\)\.$/;
    expect(row(111).raw_text).toMatch(book);
    expect(row(25).raw_text).toMatch(book);
    // The reader still links the publisher's page.
    expect(referenceDisplay(row(111))).toMatchObject({
      href: row(111).url,
      hrefLabel: "Source",
    });
  });

  it("leaves no broken umlaut in the list, and no escaped bar in 111", () => {
    const all = JSON.stringify([fixture.references, listParagraph().content]);
    for (const broken of ["»", "Zeitschift"])
      expect(all.includes(broken), broken).toBe(false);
    expect(JSON.stringify(row(111))).not.toContain("\\\\|");
    // 32 and 89 are page titles with the same escaped bar. Stuart has not
    // said how they should be cited, so they stand (asked, OPENBRAIN-193).
    expect(
      fixture.references
        .filter((r) => r.raw_text.includes("\\|"))
        .map((r) => r.number)
    ).toEqual([32, 89]);
    // The reader's list (the rows) and the section's own agree on both.
    const entries = chapterBackReferences(
      { sections: [{ slug: "references", title: "References" }] },
      fixture.references
    ).entries;
    expect(entries[97].raw_text).toBe(NOW[98]);
    expect(entries[110].raw_text).toBe(NOW[111]);
  });

  it("is what the migration writes", () => {
    for (const text of Object.values(NOW)) expect(sql).toContain(`'${text}'`);
    for (const was of [WAS[98].raw_text, WAS[111].raw_text])
      expect(sql).toContain(`'${was}'`);
  });
});

const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique);
create table public.sections (id uuid primary key default gen_random_uuid(), module_id uuid, slug text);
create table public.paragraphs (id uuid primary key default gen_random_uuid(), section_id uuid,
  content jsonb, updated_at timestamptz default '2026-11-01');
create table public."references" (id uuid primary key default gen_random_uuid(), module_id uuid,
  number integer not null, authors text not null, title text not null, journal text, year integer,
  volume text, pages text, doi text, url text, pub_type text, raw_text text, unique(module_id, number));
`;

/** The fixture's references as they were, in History and in another chapter. */
async function seeded(PGlite, { slug = "foundations-of-neuroscience" } = {}) {
  const db = new PGlite();
  await db.exec(schema);
  const ids = {};
  for (const s of [slug, "another-chapter"]) {
    const { rows } = await db.query(
      "insert into modules(slug) values ($1) returning id",
      [s]
    );
    ids[s] = rows[0].id;
    for (const r of fixture.references) {
      const was = { ...r, ...(WAS[r.number] || {}) };
      await db.query(
        `insert into "references"(module_id, number, authors, title, journal, year, volume, pages, doi, url, pub_type, raw_text)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          rows[0].id,
          was.number,
          was.authors,
          was.title,
          was.journal,
          was.year,
          was.volume,
          was.pages,
          was.doi,
          was.url,
          was.pub_type,
          was.raw_text,
        ]
      );
    }
    const section = await db.query(
      "insert into sections(module_id, slug) values ($1, 'references') returning id",
      [rows[0].id]
    );
    const content = structuredClone(listParagraph().content);
    content.blocks[0].items[97] = WAS[98].raw_text;
    content.blocks[0].items[110] = WAS[111].raw_text;
    await db.query(
      "insert into paragraphs(section_id, content) values ($1, $2)",
      [section.rows[0].id, JSON.stringify(content)]
    );
  }
  return { db, ids };
}
const references = async (db, moduleId) =>
  (
    await db.query(
      `select number, authors, title, journal, year, volume, pages, doi, url, pub_type, raw_text
         from "references" where module_id = $1 order by number`,
      [moduleId]
    )
  ).rows;
const list = async (db, moduleId) =>
  (
    await db.query(
      `select p.content c, p.updated_at u from paragraphs p
         join sections s on s.id = p.section_id where s.module_id = $1`,
      [moduleId]
    )
  ).rows[0];
const bare = ({ id: _id, module_id: _module, ...rest }) => rest;

describe.skipIf(!harness || !existsSync(harness))(
  "History references 98 and 111 (SQL)",
  () => {
    it("corrects the two rows and the two list items, nothing else, and runs twice", async () => {
      const { PGlite } = require(harness);
      const { db, ids } = await seeded(PGlite);
      const history = ids["foundations-of-neuroscience"];
      await db.exec(sql);
      // All 121 rows are the fixture's: two changed, 119 as they were.
      expect(await references(db, history)).toEqual(
        fixture.references.map(bare)
      );
      const first = await list(db, history);
      expect(first.c).toEqual(listParagraph().content);
      expect(first.u > new Date("2026-11-02")).toBe(true);
      // Another chapter with the same text is not History's to correct.
      const other = await references(db, ids["another-chapter"]);
      expect(other[97].raw_text).toBe(WAS[98].raw_text);
      expect(other[110].authors).toBe(WAS[111].authors);
      expect(
        (await list(db, ids["another-chapter"])).c.blocks[0].items[110]
      ).toBe(WAS[111].raw_text);
      await db.exec(sql);
      // The second run finds nothing to change.
      expect(await references(db, history)).toEqual(
        fixture.references.map(bare)
      );
      expect((await list(db, history)).u).toEqual(first.u);
    });

    it("leaves an entry an author has since rewritten", async () => {
      const { PGlite } = require(harness);
      const { db, ids } = await seeded(PGlite);
      const history = ids["foundations-of-neuroscience"];
      await db.query(
        `update "references" set raw_text = 'Andrew-Gee, E. The Mind Mappers (2025).' where module_id = $1 and number = 111`,
        [history]
      );
      await db.query(
        `update paragraphs p set content = jsonb_set(content, '{blocks,0,items,97}', '"Burckhardt, rewritten."')
           from sections s where s.id = p.section_id and s.module_id = $1`,
        [history]
      );
      await db.exec(sql);
      const rows = await references(db, history);
      expect(rows[110]).toMatchObject({
        raw_text: "Andrew-Gee, E. The Mind Mappers (2025).",
        authors: WAS[111].authors,
        pub_type: "web",
      });
      expect(rows[97].raw_text).toBe(NOW[98]);
      const items = (await list(db, history)).c.blocks[0].items;
      expect(items[97]).toBe("Burckhardt, rewritten.");
      expect(items[110]).toBe(NOW[111]);
    });

    it("finds nothing to do without the chapter", async () => {
      const { PGlite } = require(harness);
      const { db, ids } = await seeded(PGlite, { slug: "not-history" });
      await db.exec(sql);
      const rows = await references(db, ids["not-history"]);
      expect(rows[97].raw_text).toBe(WAS[98].raw_text);
      expect(rows[110].raw_text).toBe(WAS[111].raw_text);
    });
  }
);
