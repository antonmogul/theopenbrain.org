// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import snapshots from "@/data/history/review19NovIntroduction.json";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = readFileSync(
  "supabase/migrations/20261119480000_history_review_introduction.sql",
  "utf8"
);
const quote = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(`
    create table modules (id uuid primary key default gen_random_uuid(), slug text);
    create table sections (id uuid primary key default gen_random_uuid(), module_id uuid references modules(id), slug text);
    create table paragraphs (id uuid primary key default gen_random_uuid(), section_id uuid references sections(id),
      order_index int, content jsonb, content_text text, animation_id text default 'keep-figure', updated_at timestamptz default now());
    insert into modules(slug) values ('foundations-of-neuroscience'), ('the-retina');
    insert into sections(module_id, slug) select id, 'introduction' from modules;
  `);
  for (const p of snapshots.paragraphUpdates) {
    await db.exec(`insert into paragraphs(section_id, order_index, content, content_text)
      select id, ${p.orderIndex}, ${quote(p.before.content)}, ${quote(p.before.content_text)}#>>'{}' from sections;`);
  }
  return db;
}
const rows = async (db) =>
  (
    await db.query(
      `select p.*, m.slug chapter from paragraphs p join sections s on s.id=p.section_id join modules m on m.id=s.module_id order by m.slug, p.order_index`
    )
  ).rows;

it("carries the audited before/after snapshots exactly", () => {
  expect(JSON.parse(migration.split("$intro_snapshots$")[1])).toEqual(
    snapshots.paragraphUpdates
  );
});

describe.skipIf(!harness || !existsSync(harness))(
  "History Introduction review migration",
  () => {
    it("merges the two passages with Stuart's exact suggestion and preserves identities, citations, figure and other chapters", async () => {
      const db = await fresh();
      const before = await rows(db);
      await db.exec(migration);
      const after = await rows(db);
      expect(after.slice(2)).toEqual(before.slice(2));
      for (const [i, p] of after.slice(0, 2).entries()) {
        expect(p).toMatchObject({
          id: before[i].id,
          animation_id: "keep-figure",
          ...snapshots.paragraphUpdates[i].after,
        });
      }
      expect(after[0].content.blocks[1]).toEqual({
        type: "citation_ref",
        number: 1,
      });
      expect(
        after[0].content.blocks.at(-1).content.endsWith(snapshots.suggestedText)
      ).toBe(true);
      await db.exec(migration);
      expect(await rows(db)).toEqual(after);
      await db.close();
    });

    for (const order of [0, 1])
      it(`leaves both paragraphs alone when paragraph ${order + 1} was edited`, async () => {
        const db = await fresh();
        await db.exec(
          `update paragraphs set content_text='An author edit' where order_index=${order}`
        );
        const before = await rows(db);
        await db.exec(migration);
        expect(await rows(db)).toEqual(before);
        await db.close();
      });

    it("fails closed on an ambiguous chapter version", async () => {
      const db = await fresh();
      await db.exec(
        "insert into modules(slug) values ('foundations-of-neuroscience')"
      );
      await expect(db.exec(migration)).rejects.toThrow(
        "ambiguous chapter version"
      );
      await db.close();
    });
  }
);
