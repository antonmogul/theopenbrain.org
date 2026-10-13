// @vitest-environment node
/** Runs 20261013000000_history_stuart_13_oct.sql in PGlite (OPENBRAIN-138).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyStuart13Oct.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261013000000_history_stuart_13_oct.sql",
  "utf8"
);
const fig = (key, file) =>
  `('${key}', '/publicAssets/images/foundations/${file}', '{"images": [{"src": "/publicAssets/images/foundations/${file}", "alt": "x"}]}')`;
const widget = (id) =>
  `'{"blocks": [{"type": "widget", "widgetId": "${id}", "kind": "inline", "title": "Old", "blurb": "Old"}]}'`;
const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.animations (id uuid primary key default gen_random_uuid(), animation_key text unique not null,
  config jsonb not null default '{}', image_file_url text, updated_at timestamptz default now());
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id), slug text not null, order_index int not null);
create table public.paragraphs (id uuid primary key default gen_random_uuid(), section_id uuid references public.sections(id),
  order_index int not null, has_animation boolean default false, animation_id uuid references public.animations(id),
  animation_trigger text, content jsonb default '{}', updated_at timestamptz default now());
insert into modules(slug) values ('foundations-of-neuroscience');
insert into animations(animation_key, image_file_url, config) values
  ${fig("animationFoundationsFig1", "fig01-01.jpg")},
  ${fig("animationFoundationsFig16", "fig16-01.jpg")},
  ${fig("animationFoundationsClosingHM", "hm-brain.jpg")},
  ${fig("animationFoundationsLocalizationPortraits", "portrait-descartes.jpg")};
insert into sections(module_id, slug, order_index) select id, 'do-different-parts', 2 from modules;
insert into sections(module_id, slug, order_index) select id, 'box-penfield', 9 from modules;
insert into paragraphs(section_id, order_index) select s.id, g from sections s, generate_series(3, 6) g where s.slug = 'do-different-parts';
update paragraphs set animation_id = (select id from animations where animation_key = 'animationFoundationsLocalizationPortraits'), has_animation = true where order_index = 4;
insert into paragraphs(section_id, order_index, content) select s.id, 13, ${widget("phrenology")}::jsonb from sections s where s.slug = 'do-different-parts';
insert into paragraphs(section_id, order_index, content) select s.id, 3, ${widget("case-cabinet")}::jsonb from sections s where s.slug = 'box-penfield';
`;

describe.skipIf(!harness || !existsSync(harness))(
  "History 13 Oct changes (SQL)",
  () => {
    it("moves the portraits past the Descartes box, busts the re-cut images and retitles the widgets", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(schema);
      await db.exec(sql);
      await db.exec(sql);
      const portraits = await db.query(
        "select p.order_index from paragraphs p join animations a on a.id = p.animation_id where a.animation_key = 'animationFoundationsLocalizationPortraits'"
      );
      expect(portraits.rows).toEqual([{ order_index: 5 }]);
      const imgs = await db.query(
        "select animation_key k, image_file_url u, config->'images'->0->>'src' s from animations order by animation_key"
      );
      for (const row of imgs.rows) {
        const busted = row.k !== "animationFoundationsLocalizationPortraits";
        expect(row.u.endsWith("?v=2")).toBe(busted);
        expect(row.s).toBe(row.u);
      }
      const titles = await db.query(
        "select content->'blocks'->0->>'widgetId' w, content->'blocks'->0->>'title' t, content->'blocks'->0->>'blurb' b from paragraphs where content ? 'blocks' order by 1"
      );
      expect(titles.rows).toEqual([
        {
          w: "case-cabinet",
          t: "Be Penfield",
          b: "Explore what having your brain electrically stimulated by Penfield was like.",
        },
        {
          w: "phrenology",
          t: "Explore phrenology",
          b: "Click on different parts of the skull to explore Gall and Spurzheim's model of localization of brain function.",
        },
      ]);
    });
  }
);
