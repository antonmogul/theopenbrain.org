// @vitest-environment node
/** Runs 20261021050000_retina_placeholder_section_figure.sql in PGlite (OPENBRAIN-148).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/retinaPlaceholderSectionFigure.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261021050000_retina_placeholder_section_figure.sql",
  "utf8"
);
const schema = `
create table public.animations (id uuid primary key default gen_random_uuid(), animation_key text unique not null, title text);
create table public.sections (id uuid primary key default gen_random_uuid(), slug text not null,
  animation_id uuid references public.animations(id), animation_config jsonb, updated_at timestamptz default '2026-06-01');
insert into animations(animation_key, title) values ('animationPlaceholder', 'Placeholder'), ('animationDragon', 'Dragon');
insert into sections(slug, animation_id, animation_config)
select 'looking-forward', id, '{"name": "Placeholder"}' from animations where animation_key = 'animationPlaceholder';
insert into sections(slug, animation_id, animation_config)
select 'footnotes', id, null from animations where animation_key = 'animationPlaceholder';
insert into sections(slug, animation_id, animation_config)
select 'introduction', id, '{"name": "dragon"}' from animations where animation_key = 'animationDragon';
insert into sections(slug, animation_id, animation_config) values ('orphan', null, '{"name": "Placeholder"}');
insert into sections(slug, animation_id, animation_config) values ('plain', null, null);
`;

describe.skipIf(!harness || !existsSync(harness))(
  "Retina placeholder section figure (SQL)",
  () => {
    it("takes animationPlaceholder off every section and keeps real figures", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(schema);
      await db.exec(sql);
      await db.exec(sql);
      const { rows } = await db.query(
        "select s.slug, a.animation_key k, s.animation_config c, s.updated_at > '2026-10-01' u from sections s left join animations a on a.id = s.animation_id order by s.slug"
      );
      expect(rows).toEqual([
        { slug: "footnotes", k: null, c: null, u: true },
        {
          slug: "introduction",
          k: "animationDragon",
          c: { name: "dragon" },
          u: false,
        },
        { slug: "looking-forward", k: null, c: null, u: true },
        { slug: "orphan", k: null, c: null, u: true },
        { slug: "plain", k: null, c: null, u: false },
      ]);
      const anims = await db.query("select count(*)::int n from animations");
      expect(anims.rows[0].n).toBe(2);
      await db.close();
    });
  }
);
