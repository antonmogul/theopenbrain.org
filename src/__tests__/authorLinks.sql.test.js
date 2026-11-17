// @vitest-environment node
/** Runs 20261117197000_author_links.sql in PGlite (OPENBRAIN-197).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/authorLinks.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AUTHOR_PROFILES,
  AUTHORS_BY_SLUG,
  authorCardsForModule,
} from "@/helper/chapterAuthors";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261117197000_author_links.sql",
  "utf8"
);
const fixture = JSON.parse(
  readFileSync("src/stories/historyFullReaderData.json", "utf8")
);

// The rows as production holds them (17 Nov 2026).
const ARJUN = {
  name: "Arjun Krishnaswamy",
  affiliation: "Department of Physiology, McGill University, Montreal, Canada",
};
const STUART_RETINA = {
  name: "Stuart Trenholm",
  affiliation:
    "Montreal Neurological Institute, McGill University, Montreal, Canada",
};
const NAGUIB = {
  name: "Naguib Mechawar",
  affiliation:
    "Douglas Mental Health University Institute; Department of Psychiatry, McGill University",
};
const STUART_HISTORY = {
  name: "Stuart Trenholm",
  affiliation: "Montreal Neurological Institute, McGill University",
};
const q = (value) => `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
const schema = `
create table public.modules (id serial primary key, slug text unique not null,
  authors jsonb, updated_at timestamptz default '2026-11-01');
insert into modules(slug, authors) values
  ('foundations-of-neuroscience', ${q([NAGUIB, STUART_HISTORY])}),
  ('the-retina', ${q([ARJUN, STUART_RETINA])}),
  ('attention-and-working-memory', ${q([ARJUN])}),
  ('stress', null),
  ('guests', ${q([{ name: "A. Guest", affiliation: "Somewhere" }])}),
  ('own-link', ${q([{ ...STUART_HISTORY, url: "https://example.org/own" }])});
`;
const url = (name) => AUTHOR_PROFILES[name].url;

describe("author links (code and fixture)", () => {
  it("the migration writes the links the reader has in code", () => {
    for (const [name, profile] of Object.entries(AUTHOR_PROFILES))
      expect(sql).toContain(`('${name}', '${profile.url}')`);
  });

  it("the code-side Attention authors are the ones the migration leaves", () => {
    expect(
      AUTHORS_BY_SLUG["attention-and-working-memory"].map((a) => a.name)
    ).toEqual(["Arjun Krishnaswamy", "Erik Cook"]);
    const erik = AUTHORS_BY_SLUG["attention-and-working-memory"][1];
    expect(sql).toContain(`'affiliation', '${erik.affiliation}'`);
  });

  it("the History fixture carries the links, and the reader shows the same with or without them", () => {
    expect(fixture.module.authors).toEqual([
      { ...NAGUIB, url: url("Naguib Mechawar") },
      { ...STUART_HISTORY, url: url("Stuart Trenholm") },
    ]);
    const before = { ...fixture.module, authors: [NAGUIB, STUART_HISTORY] };
    expect(authorCardsForModule(fixture.module)).toEqual(
      authorCardsForModule(before)
    );
  });
});

describe.skipIf(!harness || !existsSync(harness))("author links (SQL)", () => {
  it("links each author on every chapter, adds Erik Cook to Attention, and runs twice", async () => {
    const { PGlite } = require(harness);
    const db = new PGlite();
    await db.exec(schema);
    await db.exec(sql);
    const read = async () =>
      Object.fromEntries(
        (
          await db.query("select slug, authors a, updated_at u from modules")
        ).rows.map((r) => [r.slug, r])
      );
    const first = await read();
    expect(first["foundations-of-neuroscience"].a).toEqual([
      { ...NAGUIB, url: url("Naguib Mechawar") },
      { ...STUART_HISTORY, url: url("Stuart Trenholm") },
    ]);
    expect(first["the-retina"].a).toEqual([
      { ...ARJUN, url: url("Arjun Krishnaswamy") },
      { ...STUART_RETINA, url: url("Stuart Trenholm") },
    ]);
    expect(first["attention-and-working-memory"].a).toEqual([
      { ...ARJUN, url: url("Arjun Krishnaswamy") },
      {
        name: "Erik Cook",
        affiliation:
          "Department of Physiology, McGill University, Montreal, Canada",
        url: url("Erik Cook"),
      },
    ]);
    // No authors, authors the book has no link for, and a link someone
    // already set: all left exactly as they were.
    expect(first.stress.a).toBeNull();
    expect(first.guests.a).toEqual([
      { name: "A. Guest", affiliation: "Somewhere" },
    ]);
    expect(first.guests.u).toEqual(first.stress.u);
    expect(first["own-link"].a[0].url).toBe("https://example.org/own");
    expect(first["own-link"].u).toEqual(first.stress.u);

    await db.exec(sql);
    const second = await read();
    // The second run finds nothing to change.
    for (const slug of Object.keys(first)) {
      expect(second[slug].a, slug).toEqual(first[slug].a);
      expect(second[slug].u, slug).toEqual(first[slug].u);
    }
  });

  it("leaves an Attention chapter alone that no longer lists Arjun", async () => {
    const { PGlite } = require(harness);
    const db = new PGlite();
    await db.exec(
      `create table public.modules (id serial primary key, slug text unique not null, authors jsonb, updated_at timestamptz);
       insert into modules(slug, authors) values ('attention-and-working-memory', ${q([{ name: "Someone Else", affiliation: "Elsewhere" }])});`
    );
    await db.exec(sql);
    const { rows } = await db.query("select authors a from modules");
    expect(rows[0].a).toEqual([
      { name: "Someone Else", affiliation: "Elsewhere" },
    ]);
  });
});
