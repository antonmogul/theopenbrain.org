// @vitest-environment node
/** Isolated data-only SQL rehearsal. Set HISTORY_SQL_HARNESS to a local PGlite
 * package path. No server, credentials, auth, extensions or network are used.
 * This verifies guards and data behavior, not hosted RLS or production parity.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import manifest from "../data/history/referenceLinks.json";
import sourceRepairs from "../data/history/sourceContentRepairs.json";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261005010000_history_retina_reference_links.sql",
  "utf8"
);
const baselineSql = readFileSync(
  "supabase/migrations/20260925050000_import_chapter_references.sql",
  "utf8"
);
let db;

async function reset({ repairKatz = true, seed = true } = {}) {
  if (!db) {
    const { PGlite } = require(harness);
    db = new PGlite();
  }
  await db.exec(`
    drop schema public cascade; create schema public;
    create table public.modules (id uuid primary key default gen_random_uuid(),
      content_version_id uuid not null default gen_random_uuid(), slug text not null,
      unique(content_version_id, slug));
    create table public."references" (
      id uuid primary key default gen_random_uuid(), module_id uuid references public.modules(id),
      number integer not null, authors text not null, title text not null, journal text, year integer,
      volume text, pages text, doi text, url text, pub_type text, raw_text text,
      created_at timestamptz default now(), unique(module_id, number));
  `);
  if (!seed) return;
  await db.exec(`insert into modules(slug) values
    ('foundations-of-neuroscience'), ('the-retina'), ('unrelated-chapter');`);
  await db.exec(baselineSql);
  if (repairKatz) {
    const after = sourceRepairs.referenceUpdates[0].after;
    const columns = Object.keys(after);
    await db.query(
      `update public."references" r set ${columns.map((column, i) => `${column}=$${i + 1}`).join(",")}
       from modules m where r.module_id=m.id and m.slug='foundations-of-neuroscience' and r.number=79`,
      Object.values(after)
    );
  }
  await db.exec(`insert into public."references" (module_id, number, authors, title, journal, year, volume, pages, doi, url, pub_type, raw_text)
    select m.id, r.number, r.authors, r.title, r.journal, r.year, r.volume, r.pages, r.doi, r.url, r.pub_type, r.raw_text
    from public."references" r join modules source on source.id=r.module_id
    cross join modules m where source.slug='foundations-of-neuroscience' and m.slug='unrelated-chapter';`);
}

async function rows() {
  return (
    await db.query(
      `select m.slug, r.* from public."references" r join modules m on m.id=r.module_id order by m.slug,r.number,r.id`
    )
  ).rows;
}
function key(row) {
  return `${row.slug}/${row.number}`;
}
async function edit(entry, column, value) {
  await db.query(
    `update public."references" r set ${column}=$1 from modules m where r.module_id=m.id and m.slug=$2 and r.number=$3`,
    [value, entry.chapterSlug, entry.number]
  );
}
afterAll(async () => {
  if (db) await db.close();
});

describe.skipIf(!harness)(
  "reference links in isolated PostgreSQL-compatible PGlite",
  () => {
    it("matches committed seed snapshots, adds exactly 23 links, preserves all citations and dates, and is idempotent", async () => {
      await reset();
      const before = await rows();
      for (const entry of manifest.entries) {
        const row = before.find(
          (r) => key(r) === `${entry.chapterSlug}/${entry.number}`
        );
        for (const [column, value] of Object.entries(entry.before))
          expect(row[column]).toEqual(value);
      }
      await db.exec(sql);
      const after = await rows();
      expect(after).toHaveLength(before.length);
      let changed = 0;
      for (let i = 0; i < before.length; i++) {
        const original = before[i];
        const row = after[i];
        const entry = manifest.entries.find(
          (e) => `${e.chapterSlug}/${e.number}` === key(row)
        );
        const metadata = manifest.metadataRepairs.find(
          (e) => `${e.chapterSlug}/${e.number}` === key(row)
        );
        const expected = { ...original };
        if (entry?.status === "verified") {
          expected.doi = entry.doi;
          expected.url = entry.url;
          changed++;
        }
        if (metadata) Object.assign(expected, metadata.after);
        expect(row, key(row)).toEqual(expected);
        expect(row.raw_text).toBe(original.raw_text);
        expect(row.year).toBe(original.year);
      }
      expect(changed).toBe(23);
      await db.exec(sql);
      expect(await rows()).toEqual(after);
    }, 30000);

    it("preserves divergent raw text, every metadata field and either existing link", async () => {
      await reset();
      const candidates = manifest.entries.filter(
        (e) => e.status === "verified" && e.number !== 59
      );
      const changes = {
        authors: "Author edited",
        title: "Title edited",
        journal: "Journal edited",
        year: 2026,
        volume: "Changed volume",
        pages: "Changed pages",
        pub_type: "Changed type",
        raw_text: "Author’s revised citation",
        doi: "10.1234/already-linked",
        url: "https://example.org/already-linked",
      };
      const protectedKeys = [];
      let i = 0;
      for (const [column, value] of Object.entries(changes)) {
        const entry = candidates[i++];
        await edit(entry, column, value);
        protectedKeys.push(`${entry.chapterSlug}/${entry.number}`);
      }
      const cajal = manifest.entries.find(
        (e) =>
          e.chapterSlug === "foundations-of-neuroscience" && e.number === 59
      );
      await edit(cajal, "authors", "Author’s preferred attribution");
      protectedKeys.push(`${cajal.chapterSlug}/${cajal.number}`);
      const before = await rows();
      await db.exec(sql);
      const after = await rows();
      for (const protectedKey of protectedKeys) {
        expect(after.find((r) => key(r) === protectedKey)).toEqual(
          before.find((r) => key(r) === protectedKey)
        );
      }
    }, 30000);

    it("skips the truncated Katz citation if the prerequisite repair has not run", async () => {
      await reset({ repairKatz: false });
      const original = (await rows()).find(
        (r) => key(r) === "foundations-of-neuroscience/79"
      );
      await db.exec(sql);
      expect(
        (await rows()).find((r) => key(r) === "foundations-of-neuroscience/79")
      ).toEqual(original);
    }, 30000);

    it("does not create chapters or missing references", async () => {
      await reset({ seed: false });
      await db.exec(sql);
      expect(await rows()).toEqual([]);
      expect((await db.query("select * from modules")).rows).toEqual([]);
    }, 30000);

    it("fails closed for both chapters when their slugs appear in multiple content versions", async () => {
      await reset();
      for (const slug of ["foundations-of-neuroscience", "the-retina"]) {
        const {
          rows: [module],
        } = await db.query(
          "insert into modules(slug) values ($1) returning id",
          [slug]
        );
        await db.query(
          `insert into public."references" (module_id,number,authors,title,journal,year,volume,pages,doi,url,pub_type,raw_text)
        select $1,r.number,r.authors,r.title,r.journal,r.year,r.volume,r.pages,r.doi,r.url,r.pub_type,r.raw_text
        from public."references" r join modules m on m.id=r.module_id where m.slug=$2 and m.id<>$1`,
          [module.id, slug]
        );
      }
      const before = await rows();
      await db.exec(sql);
      expect(await rows()).toEqual(before);
    }, 30000);

    it("stays within the caller transaction and supports a complete rollback", async () => {
      await reset();
      const before = await rows();
      await db.exec("begin");
      await db.exec(sql);
      expect(await rows()).not.toEqual(before);
      await db.exec("rollback");
      expect(await rows()).toEqual(before);
    }, 30000);
  }
);
