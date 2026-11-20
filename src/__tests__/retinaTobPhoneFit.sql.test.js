// @vitest-environment node
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import manifest from "./fixtures/retinaTobPhoneFit.json";
import { atWidgetsDb } from "./helpers/retinaWidgetsDb.mjs";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261120066210_retina_tob_phone_fit.sql",
  "utf8"
);
const baseSql = readFileSync(
  "supabase/migrations/20261120066200_retina_widgets_db.sql",
  "utf8"
);
const file = (slug) => readFileSync(`src/widgets/uploads/${slug}.html`, "utf8");
const md5 = (text) => createHash("md5").update(text).digest("hex");
async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(
    "create table widget_uploads(slug text primary key,html text,title text,author text,status text,updated_at timestamptz)"
  );
  for (const row of manifest)
    await db.query(
      "insert into widget_uploads values($1,$2,$1,'Author metadata','published',null)",
      [row.slug, atWidgetsDb(file(row.slug))]
    );
  await db.exec(
    "insert into widget_uploads values('unrelated','Keep me','Other title','Other author','draft',null)"
  );
  return db;
}
const rows = async (db) =>
  (await db.query("select * from widget_uploads order by slug")).rows;
it("guards the exact 066200 bytes and changes only the marked CSS block", () => {
  expect(manifest).toHaveLength(8);
  for (const row of manifest) {
    expect(md5(atWidgetsDb(file(row.slug)))).toBe(row.beforeMd5);
    expect(md5(file(row.slug))).toBe(row.afterMd5);
    expect(baseSql).toContain(row.beforeMd5);
  }
});
describe.skipIf(!harness || !existsSync(harness))(
  "fitted phone artwork repair SQL",
  () => {
    it("re-uploads exact files and preserves metadata and publication choices, twice", async () => {
      const db = await fresh();
      try {
        await db.query(
          "update widget_uploads set status='draft' where slug=$1",
          [manifest[0].slug]
        );
        const before = await rows(db);
        await db.exec(sql);
        const after = await rows(db);
        for (const row of after) {
          const old = before.find((r) => r.slug === row.slug);
          expect([row.title, row.author, row.status]).toEqual([
            old.title,
            old.author,
            old.status,
          ]);
          expect(row.html).toBe(
            row.slug === "unrelated" ? "Keep me" : file(row.slug)
          );
        }
        await db.exec(sql);
        expect(await rows(db)).toEqual(after);
      } finally {
        await db.close();
      }
    }, 30000);
    it("refuses an intervening author edit and rolls back the whole repair", async () => {
      const db = await fresh();
      try {
        await db.query(
          "update widget_uploads set html=html || '<!-- author edit -->' where slug=$1",
          [manifest.at(-1).slug]
        );
        const before = await rows(db);
        await expect(db.exec(sql)).rejects.toThrow(/changed since 066200/);
        expect(await rows(db)).toEqual(before);
      } finally {
        await db.close();
      }
    }, 30000);
  }
);
