/** Build a complete-reader fixture from committed SQL, never a live database.
 * Usage: node scripts/history-full-reader-generate.mjs /path/to/@electric-sql/pglite [--check]
 * PGlite is supplied by the isolated CI harness, not an application dependency.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const harness = process.argv[2];
assert(
  harness && !harness.startsWith("--"),
  "Supply an installed PGlite module path"
);
const { PGlite } = require(harness);
const db = new PGlite();
const sources = [
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
// Only columns consumed by these migrations. This is an in-memory content
// reconstruction, not the application schema, authentication, RLS or production.
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
try {
  await db.exec(schema);
  const sourceHashes = [];
  for (const filename of sources) {
    const path = `supabase/migrations/${filename}`;
    const sql = await readFile(path, "utf8");
    await db.exec(sql);
    sourceHashes.push({
      path,
      sha256: createHash("sha256").update(sql).digest("hex"),
    });
  }
  const rows = async (table, order) =>
    (await db.query(`select * from public."${table}" order by ${order}`)).rows;
  const [modules, sections, paragraphs, animations] = await Promise.all([
    rows("modules", "slug"),
    rows("sections", "order_index"),
    rows("paragraphs", "section_id, order_index"),
    rows("animations", "animation_key"),
  ]);
  assert.equal(modules.length, 1);
  assert.equal(sections.length, 16);
  const boxRows = sections.filter((s) => s.slug.startsWith("box-"));
  assert.equal(boxRows.length, 8);
  assert(
    boxRows.every((s) => s.parent_section_id && s.anchor_paragraph_id),
    "All eight boxes must be placed by committed SQL"
  );
  const repairs = JSON.parse(
    await readFile("src/data/history/sourceContentRepairs.json", "utf8")
  );
  for (const repair of repairs.paragraphUpdates) {
    const s = sections.find((s) => s.slug === repair.sectionSlug);
    const p = paragraphs.find(
      (p) => p.section_id === s.id && p.order_index === repair.orderIndex
    );
    assert.deepEqual(
      p.content,
      repair.after.content,
      `Repair content mismatch: ${repair.sectionSlug}/${repair.orderIndex}`
    );
    assert.equal(p.content_text, repair.after.content_text);
  }
  for (const fragment of repairs.fragments) {
    const s = sections.find((s) => s.slug === fragment.sectionSlug);
    assert(
      !paragraphs.some(
        (p) => p.section_id === s.id && p.order_index === fragment.orderIndex
      )
    );
  }
  // Replace random seed IDs with stable, source-derived fixture IDs. These are
  // not production IDs and do not alter the migration inputs or semantics.
  const ids = new Map([[modules[0].id, "history-fixture-module"]]);
  for (const s of sections) ids.set(s.id, `history-section-${s.slug}`);
  for (const a of animations)
    ids.set(a.id, `history-animation-${a.animation_key}`);
  for (const p of paragraphs)
    ids.set(p.id, `${ids.get(p.section_id)}-p${p.order_index}`);
  const pick = (row, fields) =>
    Object.fromEntries(
      fields.map((key) => [key, ids.get(row[key]) || row[key]])
    );
  const fixture = {
    boundary:
      "Complete ChapterView/TextComp with committed seed + selected content migrations in isolated PGlite; no production-state, authentication, RLS or deployed-route assertion.",
    sources: sourceHashes,
    omissions: [
      "The 20260925010000 Figure 3/4 production-UUID remap does not match random seed IDs. Its guarded check returns without asserting production rows. Figure A/B artwork merge does apply.",
      "No committed widget paragraph rows exist in the seeds, so the assembly migration's inline-widget conversion is a no-op. The real reader uses its committed code placements (breakout cards).",
      "Structured reference-table imports are not reconstructed; the full seeded References section remains the source. Source repair reference-table update has no matching imported row.",
    ],
    module: pick(modules[0], [
      "id",
      "title",
      "slug",
      "description",
      "order_index",
      "status",
      "layout_config",
      "key_takeaways",
      "authors",
    ]),
    sections: sections.map((s) =>
      pick(s, [
        "id",
        "module_id",
        "title",
        "slug",
        "order_index",
        "introduction_text",
        "parent_section_id",
        "anchor_paragraph_id",
      ])
    ),
    paragraphs: paragraphs
      .map((p) =>
        pick(p, [
          "id",
          "section_id",
          "content",
          "content_text",
          "order_index",
          "has_animation",
          "animation_id",
          "animation_trigger",
          "is_subsection_header",
          "subsection_level",
        ])
      )
      .sort(
        (a, b) =>
          a.section_id.localeCompare(b.section_id) ||
          a.order_index - b.order_index
      ),
    animations: animations.map((a) =>
      pick(a, [
        "id",
        "animation_key",
        "title",
        "description",
        "media_type",
        "interaction_type",
        "component_name",
        "config",
        "image_file_url",
      ])
    ),
  };
  const target = "src/views/__stories__/historyFullReaderData.json";
  // Prettier owns repository JSON layout; compare parsed data for --check.
  if (process.argv.includes("--check")) {
    assert.deepEqual(
      JSON.parse(await readFile(target, "utf8")),
      fixture,
      "Regenerate the full reader fixture after source migration changes"
    );
  } else await writeFile(target, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(
    `Full reader fixture ${process.argv.includes("--check") ? "verified" : "generated"}: ${sections.length} sections, ${paragraphs.length} paragraphs, ${animations.length} animations, all eight box anchors and source-content repairs.`
  );
} finally {
  await db.close();
}
