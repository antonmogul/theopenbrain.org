// @vitest-environment node
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const read = (path) => readFileSync(path, "utf8");
const old = read(
  "supabase/migrations/20261021030000_history_loewi_widget_fit.sql"
).split("$w$")[1];
const html = read("src/widgets/uploads/loewi-vagusstoff.html");
const sql = read(
  "supabase/migrations/20261022030000_g5_loewi_caption_layout.sql"
);
const digest = (s) => createHash("sha256").update(s).digest("hex");

it("preserves every embedded source asset, narration, timeline and credit", () => {
  const assets = (s) =>
    [...s.matchAll(/data:[^"'\s<>]+/g)].map(([x]) => digest(x));
  expect(assets(html)).toEqual(assets(old));
  const timeline = (s) => s.match(/const TL = (.*);/)[1];
  expect(timeline(html)).toBe(timeline(old));
  expect(html.match(/<div class="cite">[\s\S]*?<\/div>/)[0]).toBe(
    old.match(/<div class="cite">[\s\S]*?<\/div>/)[0]
  );
  expect(html).toContain("LOEWI 1921 · FIGURE 1</text>");
  // Ignore whitespace-only lines in the presentation file; SVG markup is unchanged.
  const svg = (s) =>
    s.match(/<svg id="scene"[\s\S]*?<\/svg>/)[0].replace(/^[\t ]+$/gm, "");
  expect(svg(html)).toBe(svg(old));
  expect(sql.split("$loewi$")[1]).toBe(html);
});

it("permits embedded narration in the inherited parent policy without widening other directives", () => {
  const policy = read("index.html").match(
    /http-equiv="Content-Security-Policy"\s+content="([^"]+)/
  )[1];
  expect(policy.match(/media-src ([^;]+)/)[1].split(" ")).toEqual([
    "'self'",
    "data:",
    "blob:",
    "https://*.supabase.co",
  ]);
  expect(policy.match(/connect-src ([^;]+)/)[1]).not.toContain("data:");
  expect(read("src/widgets/uploaded/WidgetFrame.vue")).toContain(
    'sandbox="allow-scripts"'
  );
  expect(read("src/widgets/uploaded/widgetHost.js")).toContain(
    "\"connect-src 'none'\""
  );
});

describe.skipIf(!harness || !existsSync(harness))(
  "guarded G5 Loewi reupload",
  () => {
    async function fixture(value = old) {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(`create table widget_uploads (slug text primary key, html text not null,
      title text, status text, source text, updated_at timestamptz default now());`);
      if (value !== null)
        await db.query(
          `insert into widget_uploads values
      ('loewi-vagusstoff', $1, 'Original title', 'published', 'Original credit', '2026-10-21')`,
          [value]
        );
      await db.exec(
        "insert into widget_uploads(slug, html) values ('unrelated', '<p>unchanged</p>')"
      );
      return db;
    }
    it("updates the known upload once and preserves metadata and other uploads", async () => {
      const db = await fixture();
      try {
        await db.exec(sql);
        const first = (
          await db.query("select * from widget_uploads order by slug")
        ).rows;
        expect(first[0]).toMatchObject({
          html,
          title: "Original title",
          status: "published",
          source: "Original credit",
        });
        expect(first[1].html).toBe("<p>unchanged</p>");
        await db.exec(sql);
        expect(
          (await db.query("select * from widget_uploads order by slug")).rows
        ).toEqual(first);
      } finally {
        await db.close();
      }
    });
    it("refuses an unknown author edit without overwriting it", async () => {
      const db = await fixture(old + "<!-- intervening edit -->");
      try {
        await expect(db.exec(sql)).rejects.toThrow(
          "differs from the expected baseline"
        );
        expect(
          (
            await db.query(
              "select html from widget_uploads where slug='loewi-vagusstoff'"
            )
          ).rows[0].html
        ).toBe(old + "<!-- intervening edit -->");
      } finally {
        await db.close();
      }
    });
    it("refuses a missing prerequisite rather than silently succeeding", async () => {
      const db = await fixture(null);
      try {
        await expect(db.exec(sql)).rejects.toThrow("upload missing");
      } finally {
        await db.close();
      }
    });
  }
);
