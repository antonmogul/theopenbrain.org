// @vitest-environment node
/** Runs 20261111180000_history_cutout_figures.sql in PGlite (OPENBRAIN-180).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyCutoutFigures.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261111180000_history_cutout_figures.sql",
  "utf8"
);
const DIR = "/publicAssets/images/foundations/";
const fig = (key, file) =>
  `('${key}', 'Old title', '${DIR}${file}', '{"figureNumber": 1, "caption": "Kept.", "images": [{"src": "${DIR}${file}", "alt": "Kept."}]}')`;
const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.animations (id uuid primary key default gen_random_uuid(), animation_key text unique not null,
  title text, media_type text, interaction_type text, component_name text, scientific_domain text, load_priority text,
  config jsonb not null default '{}', image_file_url text, updated_at timestamptz default now());
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id), slug text not null, order_index int not null);
create table public.paragraphs (id uuid primary key default gen_random_uuid(), section_id uuid references public.sections(id),
  order_index int not null, has_animation boolean default false, animation_id uuid references public.animations(id),
  animation_trigger text, content jsonb default '{}', updated_at timestamptz default now());
insert into modules(slug) values ('foundations-of-neuroscience'), ('the-retina');
insert into animations(animation_key, title, image_file_url, config) values
  ${fig("animationFoundationsFig1", "fig01-01.jpg?v=2")},
  ${fig("animationFoundationsFig3", "fig03-01.jpg")},
  ${fig("animationFoundationsFig5", "fig05-01-pig.jpg")};
insert into sections(module_id, slug, order_index) select id, 'where-is-my-mind', 1 from modules;
insert into paragraphs(section_id, order_index) select s.id, g from sections s, generate_series(6, 8) g;
`;
const figures = (db) =>
  db.query(
    "select animation_key k, title t, image_file_url u, config c from animations order by animation_key"
  );
const hung = (db) =>
  db.query(`select m.slug, p.order_index o, p.has_animation h, p.animation_trigger t
      from paragraphs p join sections s on s.id = p.section_id join modules m on m.id = s.module_id
      join animations a on a.id = p.animation_id
     where a.animation_key = 'animationFoundationsPlatoAristotle'`);

describe.skipIf(!harness || !existsSync(harness))(
  "History cut-out figures (SQL)",
  () => {
    async function fresh(extra = "") {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(schema + extra);
      return db;
    }

    it("swaps the two images, adds Plato and Aristotle on ¶7, and is the same on a second run", async () => {
      const db = await fresh();
      await db.exec(sql);
      const once = (await figures(db)).rows;
      await db.exec(sql);
      const twice = (await figures(db)).rows;
      const strip = (rows) =>
        rows.map(({ k, t, u, c }) => ({ k, t, u, c: JSON.stringify(c) }));
      expect(strip(twice)).toEqual(strip(once));

      const by = Object.fromEntries(once.map((r) => [r.k, r]));
      const skull = by.animationFoundationsFig1;
      expect(skull.u).toBe(`${DIR}fig01-skull-cutout.webp`);
      expect(skull.c.images).toEqual([
        { src: `${DIR}fig01-skull-cutout.webp`, alt: "Kept." },
      ]);
      // Nothing else on the record moves.
      expect(skull.c.caption).toBe("Kept.");
      expect(skull.c.figureNumber).toBe(1);
      expect(skull.t).toBe("Old title");
      expect(by.animationFoundationsFig3.u).toBe(
        `${DIR}fig03-papyrus-cutout.webp`
      );
      expect(by.animationFoundationsFig5.u).toBe(`${DIR}fig05-01-pig.jpg`);

      const plato = by.animationFoundationsPlatoAristotle;
      expect(plato.u).toBe(`${DIR}plato-aristotle.webp`);
      expect(plato.c.images[0].src).toBe(plato.u);
      expect(plato.c.images[0].alt).toMatch(/Plato.*brain.*Aristotle.*heart/);
      expect(plato.c.caption).toMatch(/School of Athens/);
      expect(plato.c.placeholder).toBe(true);
      expect(plato.c.figureNumber).toBeUndefined();
      // History's ¶7 only: not ¶6 or ¶8, and not the Retina's section of the same slug.
      expect((await hung(db)).rows).toEqual([
        { slug: "foundations-of-neuroscience", o: 7, h: true, t: "auto" },
      ]);
    });

    it("leaves an image an author has since replaced", async () => {
      const db = await fresh(
        `update animations set image_file_url = 'https://x.supabase.co/new.png',
           config = jsonb_set(config, '{images,0,src}', '"https://x.supabase.co/new.png"')
          where animation_key = 'animationFoundationsFig1';`
      );
      await db.exec(sql);
      const by = Object.fromEntries(
        (await figures(db)).rows.map((r) => [r.k, r])
      );
      expect(by.animationFoundationsFig1.u).toBe(
        "https://x.supabase.co/new.png"
      );
      expect(by.animationFoundationsFig1.c.images[0].src).toBe(
        "https://x.supabase.co/new.png"
      );
      expect(by.animationFoundationsFig3.u).toBe(
        `${DIR}fig03-papyrus-cutout.webp`
      );
    });

    it("does not take a paragraph that already has another figure", async () => {
      const db = await fresh(
        `update paragraphs p set animation_id = a.id, has_animation = true
           from animations a, sections s, modules m
          where a.animation_key = 'animationFoundationsFig5' and p.section_id = s.id
            and s.module_id = m.id and m.slug = 'foundations-of-neuroscience' and p.order_index = 7;`
      );
      await db.exec(sql);
      expect((await hung(db)).rows).toEqual([]);
      const kept = await db.query(
        `select a.animation_key k from paragraphs p join animations a on a.id = p.animation_id`
      );
      expect(kept.rows).toEqual([{ k: "animationFoundationsFig5" }]);
    });

    it("does nothing without the History module", async () => {
      const db = await fresh(
        "update modules set slug = 'elsewhere' where slug = 'foundations-of-neuroscience';"
      );
      await db.exec(sql);
      const keys = (await figures(db)).rows.map((r) => r.k);
      expect(keys).not.toContain("animationFoundationsPlatoAristotle");
    });
  }
);

it("ships the three files the migration points at", () => {
  for (const file of [
    "fig01-skull-cutout.webp",
    "fig03-papyrus-cutout.webp",
    "plato-aristotle.webp",
  ]) {
    expect(sql).toContain(`${DIR}${file}`);
    expect(existsSync(`public${DIR}${file}`)).toBe(true);
  }
});
