// @vitest-environment node
/** Runs 20261125099000_history_loewi_v7.sql in PGlite (OPENBRAIN-90).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyLoewiV7.sql.test.js (the SQL runs are
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
const sql = read("supabase/migrations/20261125099000_history_loewi_v7.sql");
const file = read("src/widgets/uploads/loewi-vagusstoff.html");
// What the row holds before this migration: v6, live since 24 Nov.
const previous = htmlIn(
  read("supabase/migrations/20261124077500_history_loewi_v6.sql")
);
const payload = htmlIn(sql);
const bookBlock = (html) =>
  html.slice(
    html.indexOf("<!-- Open Brain book:"),
    html.indexOf('<div class="fig">')
  );
const block = bookBlock(file);
// One declaration block of the book's stylesheet, by its exact selector.
const rule = (selector) => {
  const at = block.indexOf(`\n${selector}{`);
  if (at < 0) return "";
  return block.slice(at + selector.length + 2, block.indexOf("}", at));
};

describe("Loewi v7 migration", () => {
  it("carries the current file and changes only the book block", () => {
    expect(payload).toBe(file);
    const outsideBook = (html) =>
      html.replace(/<!-- Open Brain book:[\s\S]*?(?=<div class="fig">)/, "");
    expect(outsideBook(file)).toBe(outsideBook(previous));
    expect(file.match(/<!-- Open Brain book:/g)).toHaveLength(1);
    expect(Buffer.byteLength(file)).toBeLessThanOrEqual(MAX_WIDGET_BYTES);
    expect(staticChecks(file).filter((check) => !check.ok)).toEqual([]);
  });

  it("keeps everything v6 put in the book block", () => {
    for (const kept of [
      "--page:var(--ob-plate,#1a1a1a)",
      "html[data-ob-fit] .fig{",
      "html[data-ob-fit] canvas{width:auto;max-width:100%;margin:0 auto}",
      ".tip{display:none!important}",
      ".ob-key{display:none}",
      "Object.keys(TUBE)",
      'document.querySelector(".scene").after(key)',
    ])
      expect(block).toContain(kept);
    // Everything the block's script adds still runs only inside the book.
    const script = block.slice(block.indexOf("<script>"));
    expect(script.trimStart().slice(8).trimStart()).toMatch(
      /^if\(window\.OB\)\{/
    );
  });

  it("fills the box the book gives it (5e0bd444)", () => {
    // Her page margin made the document 32px taller than the pane's box, so
    // the host shrank the whole figure; without it the figure is the box.
    expect(block).toContain("\nhtml[data-ob-fit] body{padding:0}\n");
    expect(rule("html[data-ob-fit] .fig")).toContain(
      "height:var(--ob-max-height,100vh)"
    );
  });

  it("gives the stage name room and centres the key's squares (bd0342b1, b841869e)", () => {
    const key = rule("html[data-ob-book] .ob-key");
    expect(key).toContain("padding:10px var(--pad) 14px");
    // A short phone band keeps those 14px for the drawing.
    expect(block).toContain(
      "@media (max-width:560px) and (max-height:600px){html[data-ob-book] .ob-key{padding-bottom:0}}"
    );
    // A square as tall as the capitals, standing on their baseline.
    expect(rule(".ob-key li")).toContain("align-items:baseline");
    expect(rule(".ob-key i")).toBe("flex:none;width:.7em;height:.7em");
  });

  it("draws the corner label, the record's names and the key in one style (a62d9d78, d43da1be)", () => {
    // One size (the key's), one tracking; the weight is hers, 600, everywhere.
    expect(rule("html[data-ob-book] .ob-key")).toContain(
      "font:600 13px/1.3 var(--mono);letter-spacing:.05em"
    );
    expect(block).toContain("const TRACK=.05; let L=13;");
    expect(block).toContain("parseFloat(getComputedStyle(key).fontSize)");
    expect(block.match(/Math\.max\(size,L\/scale\)/g)).toHaveLength(2);
    expect(block).not.toMatch(/13\/scale/);
    expect(block).toContain("this.letterSpacing=TRACK*F");
    expect(block).toContain("track=TRACK");
    // The corner label's capitals are centred on her dot, which she draws 4
    // units above the baseline she gives the words. The block relies on
    // those two lines of hers, so hold them.
    expect(block).toContain("fillText.call(this,text,x,y-4+cap/2,...rest)");
    expect(file).toContain("ctx.arc(TX,TY,9,0,7)");
    expect(file).toContain("ctx.fillText(label,TX+20,TY+4)");
  });

  it("plays or pauses on a click anywhere but the transport bar (7a47cfd4)", () => {
    expect(block).toContain('!el.closest(".transport,button,input,a")');
    // Decided on the way down, acted on after her listeners: capture, then bubble.
    expect(block.match(/fig\.addEventListener\("click",/g)).toHaveLength(2);
    expect(block).toContain("if(go) play.click();");
    // Her own listener still answers the scene while the big play shows.
    expect(block).toContain("!(scene.contains(e.target)&&!big.hidden)");
    expect(file).toContain(
      'if(!$("bigplay").hidden && !e.target.closest("button")) toggle();'
    );
    // Not while loading, and not at the end of a drag.
    expect(block).toContain("load.hidden");
    expect(block).toContain("Math.hypot(e.clientX-px,e.clientY-py)<6");
  });
});

describe.skipIf(!harness || !existsSync(harness))("Loewi v7 (SQL)", () => {
  async function fixture(value = previous) {
    const { PGlite } = require(harness);
    const db = new PGlite();
    await db.exec(`create schema if not exists public;
      create table public.widget_uploads (slug text primary key, html text not null,
        title text, author text, status text, updated_at timestamptz default now());`);
    if (value !== null)
      await db.query(
        `insert into widget_uploads values
           ('loewi-vagusstoff', $1, 'Loewi''s Vagusstoff, 1921', 'Stuart Trenholm', 'published', '2026-11-24')`,
        [value]
      );
    await db.exec(
      "insert into widget_uploads(slug, html) values ('unrelated', '<p>unchanged</p>')"
    );
    return db;
  }
  const rows = async (db) =>
    (await db.query("select * from widget_uploads order by slug")).rows;

  it("replaces v6 once and leaves its metadata and other uploads", async () => {
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
