// @vitest-environment node
/** Runs 20261013010000_history_loewi_beside_text.sql in PGlite (OPENBRAIN-140).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyLoewiBesideText.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261013010000_history_loewi_beside_text.sql",
  "utf8"
);
const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.animations (id uuid primary key default gen_random_uuid(), animation_key text unique not null,
  title text not null, media_type text not null, interaction_type text not null, component_name text not null,
  config jsonb not null default '{}', scientific_domain text, load_priority text, updated_at timestamptz default now());
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id), slug text not null, order_index int not null);
create table public.paragraphs (id uuid primary key default gen_random_uuid(), section_id uuid references public.sections(id),
  order_index int not null, has_animation boolean default false, animation_id uuid references public.animations(id),
  animation_trigger text, content jsonb default '{}', updated_at timestamptz default now());
create table public.reading_progress (id serial primary key, last_paragraph_id uuid references public.paragraphs(id));
insert into modules(slug) values ('foundations-of-neuroscience');
insert into sections(module_id, slug, order_index) select id, 'how-neurons-communicate', 3 from modules;
insert into paragraphs(section_id, order_index, content) select s.id, g,
  case when g = 6 then '{"blocks": [{"type": "widget", "widgetId": "upload:loewi-vagusstoff", "kind": "inline"}]}'::jsonb
       else jsonb_build_object('blocks', jsonb_build_array(jsonb_build_object('type', 'text', 'content', 'p' || g))) end
  from sections s, generate_series(4, 7) g;
insert into reading_progress(last_paragraph_id) select id from paragraphs where order_index = 6;
`;

describe.skipIf(!harness || !existsSync(harness))(
  "Loewi beside the text (SQL)",
  () => {
    it("makes the upload ¶5's pane figure, held a screen, and removes the band", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(schema);
      await db.exec(sql);
      await db.exec(sql);
      const { rows } = await db.query(
        "select p.order_index i, a.animation_key k, a.media_type m, a.config->>'widgetId' w, p.content->'animationFlags'->>'hold' h, p.content->'blocks'->0->>'type' t from paragraphs p left join animations a on a.id = p.animation_id order by 1"
      );
      expect(rows).toEqual([
        { i: 4, k: null, m: null, w: null, h: null, t: "text" },
        {
          i: 5,
          k: "animationFoundationsLoewiWidget",
          m: "widget",
          w: "upload:loewi-vagusstoff",
          h: "1",
          t: "text",
        },
        { i: 7, k: null, m: null, w: null, h: null, t: "text" },
      ]);
      const progress = await db.query(
        "select p.order_index i from reading_progress r join paragraphs p on p.id = r.last_paragraph_id"
      );
      expect(progress.rows).toEqual([{ i: 5 }]);
    });
  }
);
