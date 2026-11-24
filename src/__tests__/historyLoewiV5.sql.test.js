// @vitest-environment node
/** Runs 20261120550000_history_loewi_v5.sql in PGlite (OPENBRAIN-55).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyLoewiV5.sql.test.js (the SQL runs are
 * skipped without it; the file checks always run).
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_WIDGET_BYTES, staticChecks } from "@/widgets/uploaded/widgetHost";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const read = (path) => readFileSync(path, "utf8");
const htmlIn = (text) =>
  text.slice(text.indexOf("$w$") + "$w$".length, text.lastIndexOf("$w$"));
const sql = read("supabase/migrations/20261120550000_history_loewi_v5.sql");
// Historical v5 payload: v6 now owns equality with the current widget file.
const file = htmlIn(sql);
// What the row holds before this migration: v4, published 18 Nov.
const previous = htmlIn(
  read("supabase/migrations/20261118090000_history_loewi_v4.sql")
);
const payload = htmlIn(sql);

describe("Loewi v5 migration", () => {
  it("is the exact baseline v6 replaces and changes only the book block", () => {
    const v6 = read("supabase/migrations/20261124077500_history_loewi_v6.sql");
    expect(v6).toContain(createHash("md5").update(payload).digest("hex"));
    const outsideBook = (html) =>
      html.replace(/<!-- Open Brain book:[\s\S]*?(?=<div class="fig">)/, "");
    expect(outsideBook(file)).toBe(outsideBook(previous));
    expect(Buffer.byteLength(file)).toBeLessThanOrEqual(MAX_WIDGET_BYTES);
    expect(staticChecks(file).filter((check) => !check.ok)).toEqual([]);
  });

  it("is Maura's 17 Nov file plus the comment and one marked block for the book", () => {
    expect(file).toContain("UI per Maura's Figma bar");
    expect(file).toContain('"track": "data:audio/mpeg;base64,');
    expect(file.match(/<!-- Open Brain book:/g)).toHaveLength(1);
    // The block sits before the figure and holds the book's rules.
    const block = file.slice(
      file.indexOf("<!-- Open Brain book:"),
      file.indexOf('<div class="fig">')
    );
    expect(block).toContain("--page:var(--ob-plate,#1a1a1a)");
    expect(block).toContain("html[data-ob-fit] .fig{");
    expect(block).toContain("html[data-ob-book]:not([data-ob-fit]) .fig{");
    expect(block).toContain("aspect-ratio:720/853!important");
    expect(block).toContain("html[data-ob-reduce-motion] .load .sp{");
    // Maura, 18 Nov: no time-and-section tooltip over the timeline.
    expect(block).toContain(".tip{display:none!important}");
    expect(staticChecks(file).filter((c) => !c.ok)).toEqual([]);
  });

  it("narrates in the new voice, its captions inside the track", () => {
    const track = file.match(/"track": "data:audio\/mpeg;base64,([^"]+)"/)[1];
    // Maura's narration.mp3, 1,592,470 bytes (159.19 s at 80 kb/s).
    expect(Buffer.from(track, "base64").length).toBe(1592470);
    const total = Number(file.match(/"total": ([\d.]+)/)[1]);
    expect(total).toBeGreaterThan(150);
    expect(total).toBeLessThan(159.2);
  });
});

describe.skipIf(!harness || !existsSync(harness))("Loewi v5 (SQL)", () => {
  async function fixture(value = previous) {
    const { PGlite } = require(harness);
    const db = new PGlite();
    await db.exec(`create schema if not exists public;
      create table public.widget_uploads (slug text primary key, html text not null,
        title text, author text, status text, updated_at timestamptz default now());`);
    if (value !== null)
      await db.query(
        `insert into widget_uploads values
           ('loewi-vagusstoff', $1, 'Loewi''s Vagusstoff, 1921', 'Stuart Trenholm', 'published', '2026-11-11')`,
        [value]
      );
    await db.exec(
      "insert into widget_uploads(slug, html) values ('unrelated', '<p>unchanged</p>')"
    );
    return db;
  }
  const rows = async (db) =>
    (await db.query("select * from widget_uploads order by slug")).rows;

  it("replaces v4 once and leaves its metadata and other uploads", async () => {
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
