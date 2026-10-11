// @vitest-environment node
/** Runs 20261011000000_history_manuscript_videos.sql in PGlite (OPENBRAIN-136).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyManuscriptVideos.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261011000000_history_manuscript_videos.sql",
  "utf8"
);
const img = (s) => `{"src": "/${s}.jpg"}`;
const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.animations (id uuid primary key default gen_random_uuid(), animation_key text unique not null,
  title text not null default 'x', media_type text not null default 'image', interaction_type text not null default 'static_image',
  component_name text not null default 'X', config jsonb not null default '{}', image_file_url text,
  scientific_domain text, load_priority text, updated_at timestamptz default now());
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id), slug text not null, order_index int not null);
create table public.paragraphs (id uuid primary key default gen_random_uuid(), section_id uuid references public.sections(id),
  order_index int not null, has_animation boolean default false, animation_id uuid references public.animations(id),
  animation_trigger text, updated_at timestamptz default now());
insert into modules(slug) values ('foundations-of-neuroscience');
insert into animations(animation_key, config) values
  ('animationFoundationsFig19', '{"images": [${img("g1")}, ${img("g2")}]}'),
  ('animationFoundationsFig21', '{"images": [${img("f21")}]}'),
  ('animationFoundationsMilnerHM', '{"images": [${img("milner")}, ${img("scoville")}, ${img("hm")}]}');
insert into sections(module_id, slug, order_index) select id, 'box-ngf', 11 from modules;
insert into paragraphs(section_id, order_index) select s.id, g from sections s, generate_series(1, 3) g;
`;

describe.skipIf(!harness || !existsSync(harness))(
  "History manuscript videos (SQL)",
  () => {
    it("adds each video once, in place, and the Levi-Montalcini figure to the box", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(schema);
      await db.exec(sql);
      await db.exec(sql);
      const get = async (k) =>
        (
          await db.query(
            "select config->'images' i from animations where animation_key=$1",
            [k]
          )
        ).rows[0].i;
      expect(
        (await get("animationFoundationsFig19")).map((x) => x.youtube || x.src)
      ).toEqual(["/g1.jpg", "/g2.jpg", "ZSCUbYyrHug"]);
      expect(
        (await get("animationFoundationsFig21")).map((x) => x.youtube || x.src)
      ).toEqual(["/f21.jpg", "KbA3RLz3xUQ"]);
      expect(
        (await get("animationFoundationsMilnerHM")).map(
          (x) => x.youtube || x.src
        )
      ).toEqual(["/milner.jpg", "g4-6A8u8QBc", "/scoville.jpg", "/hm.jpg"]);
      const ngf = await get("animationFoundationsNgfLeviMontalcini");
      expect(ngf).toEqual([
        expect.objectContaining({
          youtube: "WgkAR-vrJpM",
          play: "player",
          start: 2,
        }),
      ]);
      const { rows } = await db.query(
        "select p.order_index from paragraphs p join animations a on a.id = p.animation_id where a.animation_key = 'animationFoundationsNgfLeviMontalcini'"
      );
      expect(rows).toEqual([{ order_index: 2 }]);
    });
  }
);
