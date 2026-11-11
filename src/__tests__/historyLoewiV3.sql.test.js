// @vitest-environment node
/** Runs 20261111180100_history_loewi_v3.sql in PGlite (OPENBRAIN-180).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyLoewiV3.sql.test.js (the SQL runs are
 * skipped without it; the file checks always run).
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { staticChecks } from "@/widgets/uploaded/widgetHost";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const read = (path) => readFileSync(path, "utf8");
const sql = read("supabase/migrations/20261111180100_history_loewi_v3.sql");
const file = read("src/widgets/uploads/loewi-vagusstoff.html");
// What the row holds before this migration: the G5 reupload's payload.
const previous = read(
  "supabase/migrations/20261022030000_g5_loewi_caption_layout.sql"
).split("$loewi$")[1];
const payload = sql.slice(
  sql.indexOf("$w$") + "$w$".length,
  sql.lastIndexOf("$w$")
);

describe("Loewi v3 migration", () => {
  it("carries the widget file as it is in src/widgets/uploads", () => {
    expect(payload).toBe(file);
  });

  it("is Maura's file plus the comment and one marked block for the book", () => {
    expect(file).toContain("drawn with Maura's OBL artwork");
    expect(file.match(/<!-- Open Brain book:/g)).toHaveLength(1);
    // The book's block: tokens, the pane's height, phones inline, reduced motion.
    expect(file).toContain("--page:var(--ob-plate,#1a1a1a)");
    expect(file).toContain("html[data-ob-fit] .fig{");
    expect(file).toContain("html[data-ob-book]:not([data-ob-fit]) .fig{");
    expect(file).toContain("html[data-ob-reduce-motion] .load .sp{");
    expect(staticChecks(file).filter((c) => !c.ok)).toEqual([]);
  });
});

describe.skipIf(!harness || !existsSync(harness))("Loewi v3 (SQL)", () => {
  async function fixture(value = previous) {
    const { PGlite } = require(harness);
    const db = new PGlite();
    await db.exec(`create schema if not exists public;
      create table public.widget_uploads (slug text primary key, html text not null,
        title text, author text, status text, updated_at timestamptz default now());`);
    if (value !== null)
      await db.query(
        `insert into widget_uploads values
           ('loewi-vagusstoff', $1, 'Loewi''s Vagusstoff, 1921', 'Stuart Trenholm', 'published', '2026-10-22')`,
        [value]
      );
    await db.exec(
      "insert into widget_uploads(slug, html) values ('unrelated', '<p>unchanged</p>')"
    );
    return db;
  }
  const rows = async (db) =>
    (await db.query("select * from widget_uploads order by slug")).rows;

  it("replaces the known upload once and leaves its metadata and other uploads", async () => {
    const db = await fixture();
    try {
      await db.exec(sql);
      const first = await rows(db);
      expect(first[0]).toMatchObject({
        slug: "loewi-vagusstoff",
        html: file,
        title: "Loewi's Vagusstoff, 1921",
        author: "Stuart Trenholm",
        status: "published",
      });
      expect(first[1].html).toBe("<p>unchanged</p>");
      await db.exec(sql);
      expect(await rows(db)).toEqual(first);
    } finally {
      await db.close();
    }
  });

  it("refuses an edit made since, without overwriting it", async () => {
    const edited = previous + "<!-- a creator's re-upload -->";
    const db = await fixture(edited);
    try {
      await expect(db.exec(sql)).rejects.toThrow(
        "differs from the expected baseline"
      );
      expect((await rows(db))[0].html).toBe(edited);
    } finally {
      await db.close();
    }
  });

  it("refuses a missing upload rather than silently succeeding", async () => {
    const db = await fixture(null);
    try {
      await expect(db.exec(sql)).rejects.toThrow("upload missing");
    } finally {
      await db.close();
    }
  });
});
