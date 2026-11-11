// @vitest-environment node
/** Runs 20261110000000_history_penfield_binder.sql in PGlite (OPENBRAIN-168),
 * then 20261111178000_history_penfield_binder_v2.sql (OPENBRAIN-178), which
 * replaces the upload's HTML with the widget file as it is now.
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyPenfieldBinder.sql.test.js (the SQL run is
 * skipped without it; the file check always runs).
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261110000000_history_penfield_binder.sql",
  "utf8"
);
const sqlV2 = readFileSync(
  "supabase/migrations/20261111178000_history_penfield_binder_v2.sql",
  "utf8"
);
const file = readFileSync(
  "src/widgets/uploads/history-penfield-binder.html",
  "utf8"
);
const htmlIn = (text) =>
  text.slice(text.indexOf("$w$") + "$w$".length, text.lastIndexOf("$w$"));
// Version 1, as it was pushed on 10 Nov: the first migration is not edited.
const fileV1 = htmlIn(sql);

describe("Penfield binder migrations", () => {
  it("the latest carries the widget file as it is in src/widgets/uploads", () => {
    expect(htmlIn(sqlV2)).toBe(file);
  });

  it("states the file's size and hash", () => {
    expect(sqlV2).toContain(
      `-- ${Buffer.byteLength(file, "utf8")} bytes, sha256 ${createHash("sha256").update(file).digest("hex")}`
    );
  });

  it("the first still carries version 1", () => {
    expect(fileV1).toContain("Version:  1 (2026-11-10)");
    expect(file).toContain("Version:  2 (2026-11-11)");
  });

  it("version 2 changes the upload's HTML and nothing else", () => {
    const statements = sqlV2
      .split("\n")
      .filter((line) =>
        /^(insert|update|delete|alter|create|drop)\b/i.test(line)
      );
    expect(statements).toEqual([
      "insert into public.widget_uploads (slug, title, description, author, ramp, html, status)",
    ]);
    expect(sqlV2).toContain("set html = excluded.html, updated_at = now()");
    expect(sqlV2).toContain(
      "where public.widget_uploads.html is distinct from excluded.html"
    );
  });
});

const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id), slug text not null, order_index int not null);
create table public.paragraphs (id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id), content jsonb not null, content_text text,
  order_index int not null, updated_at timestamptz default now(), unique(section_id, order_index));
create table public.widget_uploads (id uuid primary key default gen_random_uuid(), slug text unique not null,
  title text not null, description text, author text, ramp text, html text not null,
  status text not null default 'draft', updated_at timestamptz default now());
`;
const widget = (extra) =>
  JSON.stringify({
    blocks: [
      { type: "text", content: "before" },
      {
        type: "widget",
        kind: "inline",
        title: "Find out what it was like to be Dr. Wilder Penfield",
        blurb: "Explore.",
        credit: "Interactive by The Open Brain",
        ...extra,
      },
    ],
  }).replace(/'/g, "''");

async function makeDb() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(schema);
  await db.exec(`
    insert into modules(slug) values ('foundations-of-neuroscience'), ('the-retina');
    insert into sections(module_id, slug, order_index)
      select id, 'box-penfield', 10 from modules where slug = 'foundations-of-neuroscience';
    insert into sections(module_id, slug, order_index)
      select id, 'do-different-parts', 2 from modules where slug = 'foundations-of-neuroscience';
    insert into sections(module_id, slug, order_index)
      select id, 'elsewhere', 1 from modules where slug = 'the-retina';
    insert into paragraphs(section_id, order_index, content)
      select id, 3, '${widget({ widgetId: "case-cabinet", route: "/case-cabinet", placementId: "foundations-case-cabinet" })}'::jsonb
        from sections where slug = 'box-penfield';
    insert into paragraphs(section_id, order_index, content)
      select id, 9, '${widget({ widgetId: "phrenology", route: "/phrenology", placementId: "foundations-phrenology" })}'::jsonb
        from sections where slug = 'do-different-parts';
    insert into paragraphs(section_id, order_index, content)
      select id, 0, '${widget({ widgetId: "case-cabinet", route: "/case-cabinet" })}'::jsonb
        from sections where slug = 'elsewhere';`);
  return db;
}

describe.skipIf(!harness || !existsSync(harness))(
  "Penfield binder (SQL)",
  () => {
    it("publishes the upload and turns the History cabinet block into the binder, once", async () => {
      const db = await makeDb();
      await db.exec(sql);
      const stamp = async () =>
        (await db.query("select max(updated_at) t from paragraphs")).rows[0].t;
      const first = await stamp();
      await db.exec(sql); // a second push changes nothing
      expect(await stamp()).toEqual(first);

      const { rows: up } = await db.query(
        "select slug, status, ramp, html from widget_uploads"
      );
      expect(up).toHaveLength(1);
      expect(up[0]).toMatchObject({
        slug: "history-penfield-binder",
        status: "published",
        ramp: "fund",
      });
      expect(up[0].html).toBe(fileV1);

      const { rows } = await db.query(
        `select s.slug, p.content->'blocks'->0 first, p.content->'blocks'->1 w
           from paragraphs p join sections s on s.id = p.section_id order by s.slug`
      );
      const by = Object.fromEntries(rows.map((r) => [r.slug, r]));
      // History's Penfield block: the binder, full screen, the rest kept
      expect(by["box-penfield"].first).toEqual({
        type: "text",
        content: "before",
      });
      expect(by["box-penfield"].w).toEqual({
        type: "widget",
        kind: "inline",
        widgetId: "upload:history-penfield-binder",
        fullScreen: true,
        title: "Find out what it was like to be Dr. Wilder Penfield",
        blurb: "Explore.",
        credit: "Interactive by The Open Brain",
        placementId: "foundations-case-cabinet",
      });
      // Phrenology keeps its widget and gains the flag
      expect(by["do-different-parts"].w).toMatchObject({
        widgetId: "phrenology",
        route: "/phrenology",
        fullScreen: true,
      });
      // Another chapter's cabinet block is not touched
      expect(by.elsewhere.w).toMatchObject({
        widgetId: "case-cabinet",
        route: "/case-cabinet",
      });
      expect(by.elsewhere.w).not.toHaveProperty("fullScreen");
    });

    it("version 2 replaces the upload's HTML, once, and leaves the chapter alone", async () => {
      const db = await makeDb();
      await db.exec(sql);
      const paragraphs = async () =>
        (
          await db.query(
            "select id, content, updated_at from paragraphs order by id"
          )
        ).rows;
      const before = await paragraphs();
      await db.exec(sqlV2);
      const row = async () =>
        (
          await db.query(
            "select slug, title, status, ramp, html, updated_at from widget_uploads"
          )
        ).rows;
      const first = await row();
      expect(first).toHaveLength(1);
      expect(first[0]).toMatchObject({
        slug: "history-penfield-binder",
        title: "Penfield's case binder",
        status: "published",
        ramp: "fund",
      });
      expect(first[0].html).toBe(file);
      await db.exec(sqlV2); // a second push changes nothing
      expect(await row()).toEqual(first);
      expect(await paragraphs()).toEqual(before);
    });

    it("version 2 alone, on a database without the upload, publishes it", async () => {
      const db = await makeDb();
      await db.exec(sqlV2);
      const { rows } = await db.query(
        "select slug, status, html from widget_uploads"
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("published");
      expect(rows[0].html).toBe(file);
    });
  }
);
