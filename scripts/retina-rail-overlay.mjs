// Execute the exact pending SQL in an isolated database, then overlay its
// rows onto the read-only live snapshot. No external database writes.
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { PGlite } = require(process.env.HISTORY_SQL_HARNESS);
const out =
  process.env.PROOF_OUT ||
  "/Volumes/Brain/artifacts/feedback-2026-11-24/OPENBRAIN-98";
const live = JSON.parse(await readFile(`${out}/live.json`, "utf8"));
const db = new PGlite();
await db.exec(`create table modules(id uuid primary key,slug text);
create table sections(id uuid primary key,module_id uuid,slug text,title text,parent_section_id uuid,anchor_paragraph_id uuid,order_index int,rail boolean,box_treatment text,box_card jsonb);
create table paragraphs(id uuid primary key,section_id uuid,order_index int,content jsonb,subsection_level int,is_subsection_header boolean);`);
await db.query("insert into modules values($1,$2)", [
  live.module.id,
  live.module.slug,
]);
for (const [table, cols] of [
  [
    "sections",
    [
      "id",
      "module_id",
      "slug",
      "title",
      "parent_section_id",
      "anchor_paragraph_id",
      "order_index",
      "rail",
      "box_treatment",
      "box_card",
    ],
  ],
  [
    "paragraphs",
    [
      "id",
      "section_id",
      "order_index",
      "content",
      "subsection_level",
      "is_subsection_header",
    ],
  ],
])
  for (const row of live[table])
    await db.query(
      `insert into ${table}(${cols}) values(${cols.map((_, i) => "$" + (i + 1))})`,
      cols.map((k) => row[k] ?? null)
    );
await db.exec(
  await readFile(
    "supabase/migrations/20261127079810_retina_rail_boxes.sql",
    "utf8"
  )
);
for (const table of ["sections", "paragraphs"])
  live[table] = (
    await db.query(`select * from ${table} order by order_index`)
  ).rows.map((row) => ({
    ...live[table].find((r) => r.id === row.id),
    ...row,
  }));
await writeFile(`${out}/migrated.json`, JSON.stringify(live, null, 2));
await db.close();
console.log(
  "Isolated SQL overlay:",
  live.sections.length,
  "sections,",
  live.paragraphs.length,
  "paragraphs"
);
