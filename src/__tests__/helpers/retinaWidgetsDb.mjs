import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";

export const migration = "20261120066200_retina_widgets_db.sql";
export const sql = readFileSync(`supabase/migrations/${migration}`, "utf8");
// Historical replay tests compare the file as 066200 published it, before
// the separate guarded phone-fit repair.
// The file as 066210 left it, before the phone blocks of OPENBRAIN-71.
export const atPhoneFit = (html) =>
  html
    .replace(
      /\/\* Open Brain rail parts \(OPENBRAIN-98\)[\s\S]*?(?=<\/style>)/,
      ""
    )
    .replace(
      /\n<!-- Open Brain book \(OPENBRAIN-71\):[^\n]+ -->\n<style>\n[\s\S]*?<\/style>\n(?=<\/head>)/,
      ""
    );
export const atWidgetsDb = (html) =>
  atPhoneFit(html).replace(
    /\n<!-- Open Brain book \(OPENBRAIN-62b\):[^\n]+ -->\n<style>\n[\s\S]*?<\/style>\n(?=<\/head>)/,
    ""
  );
export const beforeHtml = (html) =>
  atWidgetsDb(html).replace(
    /\n<!-- Open Brain book \(OPENBRAIN-62\): presentation formerly injected by widgetHost; authored scripts and artwork unchanged\. -->\n<style>\n[\s\S]*?<\/style>\n(?=<\/head>)/,
    ""
  );

export async function widgetsDb(data, uploads) {
  const require = createRequire(import.meta.url);
  const { PGlite } = require(process.env.HISTORY_SQL_HARNESS);
  const db = new PGlite();
  await db.exec(`
    create table modules(id uuid primary key,slug text);
    create table sections(id uuid primary key,module_id uuid,slug text);
    create table animations(id uuid primary key,animation_key text);
    create table paragraphs(id uuid primary key,section_id uuid,order_index int,content jsonb,content_text text,
      has_animation boolean,animation_id uuid,animation_trigger text,is_subsection_header boolean,
      subsection_level int,updated_at timestamptz,unique(section_id,order_index));
    create table widget_uploads(id uuid primary key default gen_random_uuid(),slug text unique,title text,
      description text,author text,ramp text,html text,status text,updated_at timestamptz);
  `);
  const records = {
    modules: [data.modules, ["id", "slug"]],
    sections: [data.sections, ["id", "module_id", "slug"]],
    animations: [data.animations, ["id", "animation_key"]],
    paragraphs: [
      data.paragraphs,
      [
        "id",
        "section_id",
        "order_index",
        "content",
        "content_text",
        "has_animation",
        "animation_id",
        "animation_trigger",
        "is_subsection_header",
        "subsection_level",
        "updated_at",
      ],
    ],
  };
  for (const [table, [rows, columns]] of Object.entries(records)) {
    for (const row of rows)
      await db.query(
        `insert into ${table} (${columns.join(",")}) values (${columns.map((_, i) => `$${i + 1}`).join(",")})`,
        columns.map((k) => row[k] ?? null)
      );
  }
  const oldUploads =
    uploads ||
    readdirSync("src/widgets/uploads")
      .filter(
        (name) =>
          name.startsWith("retina-") &&
          name.endsWith(".html") &&
          name !== "retina-color-vision.html"
      )
      .map((name) => ({
        slug: name.slice(0, -5),
        html: beforeHtml(readFileSync(`src/widgets/uploads/${name}`, "utf8")),
        status: "published",
      }));
  for (const row of oldUploads)
    await db.query(
      "insert into widget_uploads(slug,html,status,title,description,author,ramp) values($1,$2,$3,$4,$5,$6,$7)",
      [
        row.slug,
        row.html,
        row.status,
        row.title ?? null,
        row.description ?? null,
        row.author ?? null,
        row.ramp ?? null,
      ]
    );
  return db;
}
