// @vitest-environment node
/** Runs 20261124077500_history_loewi_v6.sql in PGlite (OPENBRAIN-75).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyLoewiV6.sql.test.js (the SQL runs are
 * skipped without it; the file checks always run).
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_WIDGET_BYTES, staticChecks } from "@/widgets/uploaded/widgetHost";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const read = (path) => readFileSync(path, "utf8");
const htmlIn = (text) =>
  text.slice(text.indexOf("$w$") + "$w$".length, text.lastIndexOf("$w$"));
const sql = read("supabase/migrations/20261124077500_history_loewi_v6.sql");
const file = read("src/widgets/uploads/loewi-vagusstoff.html");
// What the row holds before this migration: v5, live since 20 Nov.
const previous = htmlIn(
  read("supabase/migrations/20261120550000_history_loewi_v5.sql")
);
const payload = htmlIn(sql);

describe("Loewi v6 migration", () => {
  it("carries the current file and changes only the book block", () => {
    expect(payload).toBe(file);
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

  it("names the tubes in a key and redraws the record's names (v6)", () => {
    const block = file.slice(
      file.indexOf("<!-- Open Brain book:"),
      file.indexOf('<div class="fig">')
    );
    // The canvas box is the drawing's box, so her own conversions measure it.
    expect(block).toContain(
      "html[data-ob-fit] canvas{width:auto;max-width:100%;margin:0 auto}"
    );
    // The key exists only in the book and is built from her tables.
    expect(block).toContain(".ob-key{display:none}");
    expect(block).toContain("html[data-ob-book] .ob-key{display:flex");
    expect(block).toContain("Object.keys(TUBE)");
    expect(block).toContain('document.querySelector(".scene").after(key)');
    // Labels reach 13 CSS px in the frame (about 12.3 at the pane's scale).
    expect(block.match(/13\/scale/g)).toHaveLength(2);
    // Everything the block adds runs only inside the book.
    const script = block.slice(block.indexOf("<script>"));
    expect(script.trimStart().slice(8).trimStart()).toMatch(
      /^if\(window\.OB\)\{/
    );
    // Her figure markup is untouched: the key is not in the file's HTML.
    expect(file.slice(file.indexOf('<div class="fig">'))).not.toContain(
      "ob-key"
    );
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

describe.skipIf(!harness || !existsSync(harness))("Loewi v6 (SQL)", () => {
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

  it("replaces v5 once and leaves its metadata and other uploads", async () => {
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
