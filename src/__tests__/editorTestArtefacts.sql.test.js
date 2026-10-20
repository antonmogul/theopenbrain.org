// @vitest-environment node
/** Runs 20261021040000_editor_test_artefacts.sql in PGlite (OPENBRAIN-148).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/editorTestArtefacts.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261021040000_editor_test_artefacts.sql",
  "utf8"
);
const tail =
  " In this chapter, we provide a brief survey of ideas surrounding this most fascinating of organs, told through debates that helped frame our modern understanding of the brain.";
const lit = (s) => `'${s.replace(/'/g, "''")}'`;
const dirty = lit(tail + " THis is now editable");
const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id), slug text not null, title text, updated_at timestamptz default '2026-09-24');
create table public.paragraphs (id uuid primary key default gen_random_uuid(), section_id uuid references public.sections(id),
  order_index int not null, content jsonb default '{}', content_text text, updated_at timestamptz default '2026-10-09');
insert into modules(slug) values ('foundations-of-neuroscience'), ('the-retina');
insert into sections(module_id, slug, title) select id, 'introduction', 'Introduction' from modules;
insert into sections(module_id, slug, title) select id, 'story-of-the-eye', 'Story of the eye (EDIT)' from modules;
insert into paragraphs(section_id, order_index, content, content_text)
select s.id, 0,
  jsonb_build_object('blocks', jsonb_build_array(
    jsonb_build_object('type', 'text', 'content', 'Quote.'),
    jsonb_build_object('type', 'citation_ref', 'number', 1),
    jsonb_build_object('type', 'text', 'content', ${dirty}))),
  'Quote.1' || ${dirty}
from sections s where s.slug = 'introduction';
insert into paragraphs(section_id, order_index, content, content_text)
select s.id, 1, '{"blocks": [{"type": "text", "content": "Untouched."}]}'::jsonb, 'Untouched.' from sections s where s.slug = 'introduction';
`;

describe.skipIf(!harness || !existsSync(harness))(
  "Editor test artefacts (SQL)",
  () => {
    it("strips the sentence from History's blocks and text, and nothing else", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(schema);
      await db.exec(sql);
      await db.exec(sql);
      const { rows } = await db.query(
        "select m.slug, p.order_index i, p.content_text t, p.content->'blocks' b, p.updated_at > '2026-10-10' u from paragraphs p join sections s on s.id = p.section_id join modules m on m.id = s.module_id order by 1, 2"
      );
      expect(rows.map((r) => [r.slug, r.i, r.t, r.u])).toEqual([
        ["foundations-of-neuroscience", 0, "Quote.1" + tail, true],
        ["foundations-of-neuroscience", 1, "Untouched.", false],
        ["the-retina", 0, "Quote.1" + tail + " THis is now editable", false],
        ["the-retina", 1, "Untouched.", false],
      ]);
      expect(rows[0].b).toEqual([
        { type: "text", content: "Quote." },
        { type: "citation_ref", number: 1 },
        { type: "text", content: tail },
      ]);
      const titles = await db.query(
        "select m.slug, s.title, s.updated_at > '2026-10-10' u from sections s join modules m on m.id = s.module_id where s.slug = 'story-of-the-eye' order by 1"
      );
      expect(titles.rows).toEqual([
        {
          slug: "foundations-of-neuroscience",
          title: "Story of the eye (EDIT)",
          u: false,
        },
        { slug: "the-retina", title: "Story of the eye", u: true },
      ]);
      await db.close();
    });
  }
);
