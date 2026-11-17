// @vitest-environment node
/** Runs the two OPENBRAIN-200 migrations in PGlite: the Levi-Montalcini
 * video moves to the NGF box's first paragraph, and History's Further
 * reading goes.
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyStuart17Nov.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const video = readFileSync(
  "supabase/migrations/20261117200000_history_ngf_video_first.sql",
  "utf8"
);
const further = readFileSync(
  "supabase/migrations/20261117200100_history_remove_further_reading.sql",
  "utf8"
);

const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique);
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade, slug text, order_index int);
create table public.animations (id uuid primary key default gen_random_uuid(), animation_key text unique);
create table public.paragraphs (id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id) on delete cascade, order_index int,
  animation_id uuid references animations(id), animation_trigger text, has_animation boolean default false);
create table public.highlights (id uuid primary key default gen_random_uuid(),
  paragraph_id uuid not null references paragraphs(id) on delete cascade);
create table public.notes (id uuid primary key default gen_random_uuid(),
  paragraph_id uuid references paragraphs(id) on delete cascade,
  section_id uuid references sections(id) on delete cascade);
create table public.reading_progress (id uuid primary key default gen_random_uuid(),
  last_section_id uuid references sections(id), last_paragraph_id uuid references paragraphs(id));

insert into modules(slug) values ('foundations-of-neuroscience'), ('the-retina');
insert into animations(animation_key) values ('animationFoundationsNgfLeviMontalcini'), ('animationFoundationsNgfPortraits');
insert into sections(module_id, slug, order_index)
  select id, s.slug, s.o from modules, (values ('box-ngf', 11), ('references', 14), ('further-reading', 15)) s(slug, o)
   where modules.slug = 'foundations-of-neuroscience';
insert into sections(module_id, slug, order_index)
  select id, 'further-reading', 9 from modules where slug = 'the-retina';
insert into paragraphs(section_id, order_index) select id, 1 from sections where slug = 'box-ngf';
insert into paragraphs(section_id, order_index, animation_id, animation_trigger, has_animation)
  select s.id, 2, a.id, 'auto', true from sections s, animations a
   where s.slug = 'box-ngf' and a.animation_key = 'animationFoundationsNgfLeviMontalcini';
insert into paragraphs(section_id, order_index, animation_id, animation_trigger, has_animation)
  select s.id, 3, a.id, 'auto', true from sections s, animations a
   where s.slug = 'box-ngf' and a.animation_key = 'animationFoundationsNgfPortraits';
insert into paragraphs(section_id, order_index) select id, 0 from sections where slug = 'further-reading';
insert into reading_progress(last_section_id, last_paragraph_id)
  select s.id, p.id from sections s join paragraphs p on p.section_id = s.id
    join modules m on m.id = s.module_id
   where s.slug = 'further-reading' and m.slug = 'foundations-of-neuroscience';
`;

const ngf = `
select p.order_index o, a.animation_key k, p.animation_trigger t, p.has_animation h
  from paragraphs p join sections s on s.id = p.section_id
  left join animations a on a.id = p.animation_id
 where s.slug = 'box-ngf' order by 1`;

async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(schema);
  return db;
}

describe.skipIf(!harness || !existsSync(harness))(
  "Stuart 17 Nov migrations (SQL)",
  () => {
    it("moves the Levi-Montalcini video to the NGF box's first paragraph, once", async () => {
      const db = await fresh();
      await db.exec(video);
      const after = (await db.query(ngf)).rows;
      expect(after).toEqual([
        {
          o: 1,
          k: "animationFoundationsNgfLeviMontalcini",
          t: "auto",
          h: true,
        },
        { o: 2, k: null, t: null, h: false },
        { o: 3, k: "animationFoundationsNgfPortraits", t: "auto", h: true },
      ]);
      await db.exec(video);
      expect((await db.query(ngf)).rows).toEqual(after);
    });

    it("leaves the box alone when a creator has moved the figure since", async () => {
      const db = await fresh();
      await db.exec(
        "update paragraphs set animation_id = null where order_index = 2 and section_id = (select id from sections where slug = 'box-ngf')"
      );
      await db.exec(video);
      const rows = (await db.query(ngf)).rows;
      expect(rows[0].k).toBeNull();
      expect(rows[1].k).toBeNull();
    });

    it("deletes History's Further reading only, moving saved places to References", async () => {
      const db = await fresh();
      await db.exec(further);
      const left = (
        await db.query(
          "select m.slug m, s.slug s from sections s join modules m on m.id = s.module_id where s.slug = 'further-reading'"
        )
      ).rows;
      expect(left).toEqual([{ m: "the-retina", s: "further-reading" }]);
      const progress = (
        await db.query(
          "select s.slug s, r.last_paragraph_id p from reading_progress r join sections s on s.id = r.last_section_id"
        )
      ).rows;
      expect(progress).toEqual([{ s: "references", p: null }]);
      // A second run finds nothing to do.
      await db.exec(further);
    });

    it("refuses to delete a section a reader has highlighted", async () => {
      const db = await fresh();
      await db.exec(`insert into highlights(paragraph_id)
        select p.id from paragraphs p join sections s on s.id = p.section_id
          join modules m on m.id = s.module_id
         where s.slug = 'further-reading' and m.slug = 'foundations-of-neuroscience'`);
      await expect(db.exec(further)).rejects.toThrow(/highlight/);
    });
  }
);
