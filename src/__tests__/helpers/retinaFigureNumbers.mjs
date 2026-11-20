import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

export const sql = readFileSync(
  "supabase/migrations/20261120066700_retina_figure_numbers.sql",
  "utf8"
);

// Only an isolated PGlite database. Never connects to Supabase.
export async function figureNumbersDb(data) {
  const require = createRequire(import.meta.url);
  const { PGlite } = require(process.env.HISTORY_SQL_HARNESS);
  const db = new PGlite();
  await db.exec(`
    create table modules(id uuid primary key, slug text);
    create table sections(id uuid primary key, module_id uuid, slug text, animation_id uuid);
    create table paragraphs(id uuid primary key, section_id uuid, animation_id uuid, content jsonb, content_text text);
    create table animations(id uuid primary key, animation_key text, config jsonb, updated_at timestamptz);
  `);
  for (const [table, cols] of [
    ["modules", ["id", "slug"]],
    ["sections", ["id", "module_id", "slug", "animation_id"]],
    [
      "paragraphs",
      ["id", "section_id", "animation_id", "content", "content_text"],
    ],
    ["animations", ["id", "animation_key", "config"]],
  ]) {
    for (const row of data[table])
      await db.query(
        `insert into ${table}(${cols.join(",")}) values(${cols.map((_, i) => `$${i + 1}`).join(",")})`,
        cols.map((c) => row[c] ?? null)
      );
  }
  return db;
}
