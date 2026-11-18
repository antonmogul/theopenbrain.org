// @vitest-environment node
/** Runs the OPENBRAIN-205 migration in PGlite: Maura's reworked images
 * replace the old paths in History's figure records and paragraphs, exactly
 * and once, and every new file exists.
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyMauraImages.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = readFileSync(
  "supabase/migrations/20261118140000_history_maura_images.sql",
  "utf8"
);
const F = "/publicAssets/images/foundations/";

const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique);
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade, slug text);
create table public.animations (id uuid primary key default gen_random_uuid(),
  animation_key text unique, config jsonb, updated_at timestamptz);
create table public.paragraphs (id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id) on delete cascade,
  content jsonb, updated_at timestamptz);
insert into modules(slug) values ('foundations-of-neuroscience'), ('the-retina');
insert into sections(module_id, slug) select id, 's-' || slug from modules;
insert into animations(animation_key, config) values
  ('animationFoundationsFig16', '{"images":[{"src":"${F}fig16-01.jpg?v=2"}]}'),
  ('animationFoundationsFig8', '{"images":[{"src":"${F}fig08-01.jpg","alt":"map"}]}'),
  ('animationFoundationsMilnerHM', '{"images":[{"src":"${F}hm-brenda-milner.jpg"},{"src":"${F}other.jpg"}]}'),
  ('animationFoundationsFig21', '{"images":[{"src":"${F}fig21-01.jpg"}]}'),
  ('animationRetinaThing', '{"images":[{"src":"${F}fig08-01.jpg"}]}');
insert into paragraphs(section_id, content)
  select id, '{"explore":{"image":{"src":"${F}thurneysser-four-humours-1574.jpg"}}}'
    from sections where slug = 's-foundations-of-neuroscience';
insert into paragraphs(section_id, content)
  select id, '{"explore":{"image":{"src":"${F}thurneysser-four-humours-1574.jpg"}}}'
    from sections where slug = 's-the-retina';
`;

async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(schema);
  return db;
}
const state = async (db) => ({
  anims: Object.fromEntries(
    (
      await db.query(
        "select animation_key k, config c from animations order by 1"
      )
    ).rows.map((r) => [r.k, r.c])
  ),
  paras: (
    await db.query(
      "select s.slug, p.content from paragraphs p join sections s on s.id = p.section_id order by 1"
    )
  ).rows,
});

describe("Maura's images: the new files", () => {
  it("every new path the migration writes is a file in public/", () => {
    const paths = [
      ...migration.matchAll(/'(\/publicAssets\/[^']+-v2\.webp)'/g),
    ];
    expect(paths).toHaveLength(12);
    for (const [, path] of paths)
      expect(existsSync(`public${path}`), path).toBe(true);
  });
});

describe.skipIf(!harness || !existsSync(harness))(
  "Maura's images migration (SQL)",
  () => {
    it("swaps History's paths exactly, and nothing else", async () => {
      const db = await fresh();
      await db.exec(migration);
      const { anims, paras } = await state(db);
      expect(anims.animationFoundationsFig16.images[0].src).toBe(
        `${F}fig16-01-v2.webp`
      );
      expect(anims.animationFoundationsFig8.images[0]).toEqual({
        src: `${F}fig08-01-v2.webp`,
        alt: "map",
      });
      expect(
        anims.animationFoundationsMilnerHM.images.map((i) => i.src)
      ).toEqual([`${F}hm-brenda-milner-v2.webp`, `${F}other.jpg`]);
      // Eccles waits for Stuart; another chapter's records are not touched.
      expect(anims.animationFoundationsFig21.images[0].src).toBe(
        `${F}fig21-01.jpg`
      );
      expect(anims.animationRetinaThing.images[0].src).toBe(`${F}fig08-01.jpg`);
      expect(paras.map((p) => [p.slug, p.content.explore.image.src])).toEqual([
        [
          "s-foundations-of-neuroscience",
          `${F}thurneysser-four-humours-1574-v2.webp`,
        ],
        ["s-the-retina", `${F}thurneysser-four-humours-1574.jpg`],
      ]);
    });

    it("changes nothing on a second run", async () => {
      const db = await fresh();
      await db.exec(migration);
      const once = await state(db);
      await db.exec(migration);
      expect(await state(db)).toEqual(once);
    });
  }
);
