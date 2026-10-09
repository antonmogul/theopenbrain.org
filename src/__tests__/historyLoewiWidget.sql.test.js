// @vitest-environment node
/** Runs 20261009010000_history_loewi_widget.sql in PGlite (OPENBRAIN-134).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyLoewiWidget.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261009010000_history_loewi_widget.sql",
  "utf8"
);
const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.animations (id uuid primary key default gen_random_uuid(), animation_key text unique not null);
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id), slug text not null, order_index int not null);
create table public.paragraphs (id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id), content jsonb not null, content_text text,
  order_index int not null, has_animation boolean default false, animation_id uuid references public.animations(id),
  updated_at timestamptz default now(), unique(section_id, order_index));
create table public.widget_uploads (id uuid primary key default gen_random_uuid(), slug text unique not null,
  title text not null, description text, author text, ramp text, html text not null,
  status text not null default 'draft', updated_at timestamptz default now());
`;

async function makeDb() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(schema);
  await db.exec(`
    insert into modules(slug) values ('foundations-of-neuroscience');
    insert into animations(animation_key) values ('animationFoundationsFig20');
    insert into sections(module_id, slug, order_index)
      select id, 'how-neurons-communicate', 4 from modules;
    insert into paragraphs(section_id, order_index, content, has_animation, animation_id)
      select s.id, g, jsonb_build_object('blocks', jsonb_build_array(jsonb_build_object('type','text','content','p'||g))),
             g = 5, case when g = 5 then (select id from animations) end
        from sections s, generate_series(0, 9) g;`);
  return db;
}

describe.skipIf(!harness || !existsSync(harness))("Loewi widget (SQL)", () => {
  it("publishes the upload and swaps Figure 20 for the widget band", async () => {
    const db = await makeDb();
    await db.exec(sql);
    await db.exec(sql);
    const { rows: up } = await db.query(
      "select status, ramp, length(html) > 1000000 big from widget_uploads"
    );
    expect(up).toEqual([{ status: "published", ramp: "fund", big: true }]);
    const { rows } = await db.query(
      `select order_index, animation_id is not null fig,
              content->'blocks'->0->>'widgetId' widget, content->'blocks'->0->>'content' text
         from paragraphs order by order_index`
    );
    expect(rows).toHaveLength(11);
    expect(rows[5]).toMatchObject({ fig: false, text: "p5" });
    expect(rows[6]).toMatchObject({ widget: "upload:loewi-vagusstoff" });
    expect(rows.slice(7).map((r) => r.text)).toEqual(["p6", "p7", "p8", "p9"]);
    expect(rows.filter((r) => r.fig)).toHaveLength(0);
  });
});
