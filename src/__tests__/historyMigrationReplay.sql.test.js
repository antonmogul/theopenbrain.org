// @vitest-environment node
/** The History seed and content migrations, replayed in isolated PGlite.
 *
 * This is what remains of scripts/history-full-reader-generate.mjs. It used to
 * write the complete-reader fixture from this replay; the fixture is now a
 * dated export of the published chapter (docs/architecture/history-fixture.md),
 * because the chapter is edited in the admin and no longer equals its
 * migrations. The replay still proves what only it can: the committed History
 * migrations apply in order on an empty database, place all eight seeded
 * boxes, and end with every audited source repair in place.
 *
 * Run with HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyMigrationReplay.sql.test.js
 * No server, credentials, Supabase CLI, auth, extensions or network are used.
 * The schema holds only the columns these migrations touch; it is not the
 * application schema, RLS or production state.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import repairs from "../data/history/sourceContentRepairs.json";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migrations = [
  "20260605000000_seed_chapter_foundations.sql",
  "20260605000001_seed_chapter_foundations_part2.sql",
  "20260917000000_reorder_chapters_history_first.sql",
  "20260917010000_foundations_fig6_fig7_artwork.sql",
  "20260922000000_foundations_fig2_trepanation_frames.sql",
  "20260923030000_restore_foundations_intro.sql",
  "20260924010000_foundations_manuscript_figures.sql",
  "20260924020000_foundations_short_subtitle.sql",
  "20260924040000_history_boxes_and_authors.sql",
  "20260925010000_history_widgets_assembly.sql",
  "20260925040000_history_place_remaining_boxes.sql",
  "20261005000000_history_source_content_repairs.sql",
];
const schema = `
create table profiles (id uuid primary key, role text);
create table content_versions (id uuid primary key default gen_random_uuid(), version_number text, status text, created_by uuid, release_notes text);
create table modules (id uuid primary key default gen_random_uuid(), content_version_id uuid references content_versions(id), title text, slug text, description text, order_index integer, status text, created_by uuid, layout_config jsonb, key_takeaways text[], authors jsonb, updated_at timestamptz, unique(content_version_id,slug));
create table animations (id uuid primary key default gen_random_uuid(), animation_key text unique, title text, description text, media_type text, interaction_type text, component_name text, config jsonb, scientific_domain text, load_priority text, image_file_url text, updated_at timestamptz);
create table sections (id uuid primary key default gen_random_uuid(), module_id uuid references modules(id), title text, slug text, order_index integer, introduction_text text, parent_section_id uuid references sections(id), anchor_paragraph_id uuid, updated_at timestamptz, unique(module_id,slug));
create table paragraphs (id uuid primary key default gen_random_uuid(), section_id uuid references sections(id), content jsonb, content_text text, order_index integer, has_animation boolean default false, animation_id uuid references animations(id), animation_trigger text, is_subsection_header boolean default false, subsection_level integer default 0, updated_at timestamptz, unique(section_id,order_index));
alter table sections add foreign key(anchor_paragraph_id) references paragraphs(id);
create table public."references" (id uuid primary key default gen_random_uuid(), module_id uuid references modules(id), number integer, authors text, title text, journal text, year integer, volume text, pages text, doi text, url text, pub_type text, raw_text text, unique(module_id,number));
`;

let db;
let modules, sections, paragraphs, animations;

describe.skipIf(!harness)(
  "History seed and content migrations replayed in isolated PGlite",
  () => {
    beforeAll(async () => {
      const { PGlite } = require(harness);
      db = new PGlite();
      await db.exec(schema);
      for (const filename of migrations)
        await db.exec(readFileSync(`supabase/migrations/${filename}`, "utf8"));
      const rows = async (table, order) =>
        (await db.query(`select * from public."${table}" order by ${order}`))
          .rows;
      [modules, sections, paragraphs, animations] = await Promise.all([
        rows("modules", "slug"),
        rows("sections", "order_index"),
        rows("paragraphs", "section_id, order_index"),
        rows("animations", "animation_key"),
      ]);
    }, 120000);
    afterAll(async () => {
      await db?.close();
    });

    it("applies all twelve migrations in order to one chapter of 16 sections, 83 paragraphs and 33 figures", () => {
      expect(modules).toHaveLength(1);
      expect(modules[0].slug).toBe(repairs.chapterSlug);
      expect(sections).toHaveLength(16);
      expect(paragraphs).toHaveLength(83);
      expect(animations).toHaveLength(33);
    });

    it("places all eight seeded boxes under a parent section, after one of its paragraphs", () => {
      const boxes = sections.filter((s) => s.slug.startsWith("box-"));
      expect(boxes).toHaveLength(8);
      for (const box of boxes) {
        expect(box.parent_section_id, box.slug).toBeTruthy();
        const anchor = paragraphs.find((p) => p.id === box.anchor_paragraph_id);
        expect(anchor?.section_id, box.slug).toBe(box.parent_section_id);
      }
    });

    it("ends with every audited source repair applied and every stray fragment gone", () => {
      const row = ({ sectionSlug, orderIndex }) => {
        const section = sections.find((s) => s.slug === sectionSlug);
        return paragraphs.find(
          (p) => p.section_id === section.id && p.order_index === orderIndex
        );
      };
      for (const repair of repairs.paragraphUpdates) {
        const paragraph = row(repair);
        const where = `${repair.sectionSlug}/${repair.orderIndex}`;
        expect(paragraph.content, where).toEqual(repair.after.content);
        expect(paragraph.content_text, where).toBe(repair.after.content_text);
      }
      for (const fragment of repairs.fragments)
        expect(
          row(fragment),
          `${fragment.sectionSlug}/${fragment.orderIndex}`
        ).toBeUndefined();
    });
  }
);
