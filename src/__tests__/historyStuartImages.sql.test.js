// @vitest-environment node
/** Runs 20261009000000_history_stuart_images.sql in PGlite (OPENBRAIN-134).
 * Run with HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyStuartImages.sql.test.js
 * Skipped without the harness. The schema models only the columns touched.
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261009000000_history_stuart_images.sql",
  "utf8"
);
const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.animations (
  id uuid primary key default gen_random_uuid(), animation_key text unique not null,
  title text not null, media_type text not null, interaction_type text not null,
  component_name text not null, config jsonb not null default '{}', image_file_url text,
  scientific_domain text, load_priority text, updated_at timestamptz default now());
create table public.sections (
  id uuid primary key default gen_random_uuid(), module_id uuid references public.modules(id),
  slug text not null, order_index integer not null);
create table public.paragraphs (
  id uuid primary key default gen_random_uuid(), section_id uuid references public.sections(id),
  order_index integer not null, has_animation boolean default false,
  animation_id uuid references public.animations(id), animation_trigger text,
  updated_at timestamptz default now());
`;

// Sections and the paragraph counts the targets need.
const SECTIONS = [
  ["introduction", 2],
  ["do-different-parts", 19],
  ["closing-words", 1],
];

async function makeDb() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(schema);
  for (const slug of ["foundations-of-neuroscience", "the-retina"]) {
    const {
      rows: [m],
    } = await db.query("insert into modules(slug) values ($1) returning id", [
      slug,
    ]);
    for (const [i, [s, n]] of SECTIONS.entries()) {
      const {
        rows: [sec],
      } = await db.query(
        "insert into sections(module_id, slug, order_index) values ($1,$2,$3) returning id",
        [m.id, s, i]
      );
      for (let k = 0; k < n; k++)
        await db.query(
          "insert into paragraphs(section_id, order_index) values ($1,$2)",
          [sec.id, k]
        );
    }
  }
  return db;
}

const attached = (db) =>
  db.query(`select m.slug, s.slug section, p.order_index, a.animation_key, a.config
    from paragraphs p join sections s on s.id = p.section_id join modules m on m.id = s.module_id
    join animations a on a.id = p.animation_id order by m.slug, s.order_index, p.order_index`);

describe.skipIf(!harness || !existsSync(harness))(
  "History images from Stuart (SQL)",
  () => {
    it("adds four figures to the right History paragraphs only", async () => {
      const db = await makeDb();
      await db.exec(sql);
      const { rows } = await attached(db);
      expect(
        rows.map((r) => [r.slug, r.section, r.order_index, r.animation_key])
      ).toEqual([
        [
          "foundations-of-neuroscience",
          "introduction",
          0,
          "animationFoundationsIntroWoodcut",
        ],
        [
          "foundations-of-neuroscience",
          "do-different-parts",
          4,
          "animationFoundationsLocalizationPortraits",
        ],
        [
          "foundations-of-neuroscience",
          "do-different-parts",
          18,
          "animationFoundationsMilnerHM",
        ],
        [
          "foundations-of-neuroscience",
          "closing-words",
          0,
          "animationFoundationsClosingHM",
        ],
      ]);
      const hm = rows.find(
        (r) => r.animation_key === "animationFoundationsMilnerHM"
      );
      expect(hm.config.images).toHaveLength(4);
      expect(hm.config.images[3].youtube).toBe("OmmH4Rp9-to");
      expect(hm.config.figureNumber).toBeUndefined();
    });

    it("is idempotent and never replaces an existing figure", async () => {
      const db = await makeDb();
      await db.exec(`insert into animations(animation_key,title,media_type,interaction_type,component_name)
        values ('existing','x','image','static_image','X');
        update paragraphs set animation_id = (select id from animations where animation_key='existing')
        where order_index = 4 and section_id in (select id from sections where slug='do-different-parts');`);
      await db.exec(sql);
      await db.exec(sql);
      const { rows } = await attached(db);
      const fond = rows.filter((r) => r.slug === "foundations-of-neuroscience");
      expect(fond.map((r) => r.animation_key)).toEqual([
        "animationFoundationsIntroWoodcut",
        "existing",
        "animationFoundationsMilnerHM",
        "animationFoundationsClosingHM",
      ]);
      const { rows: count } = await db.query(
        "select count(*)::int n from animations"
      );
      expect(count[0].n).toBe(5);
    });
  }
);
