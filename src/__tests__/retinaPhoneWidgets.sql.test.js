// @vitest-environment node
// OPENBRAIN-71: the phone blocks in three Retina uploads. The migration must
// turn the published HTML into exactly the committed files, and nothing else.
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import manifest from "./fixtures/retinaPhoneWidgets.json";
import fixture from "../stories/retinaFullReaderData.json";
import { atPhoneFit } from "./helpers/retinaWidgetsDb.mjs";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261124077100_retina_phone_widgets.sql",
  "utf8"
);
const file = (slug) => readFileSync(`src/widgets/uploads/${slug}.html`, "utf8");
const hash = (kind, text) => createHash(kind).update(text).digest("hex");
async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(
    "create table widget_uploads(slug text primary key,html text,title text,author text,status text,updated_at timestamptz)"
  );
  for (const row of manifest)
    await db.query(
      "insert into widget_uploads values($1,$2,$1,'Author metadata','published',null)",
      [row.slug, atPhoneFit(file(row.slug))]
    );
  await db.exec(
    "insert into widget_uploads values('unrelated','Keep me','Other title','Other author','draft',null)"
  );
  return db;
}
const rows = async (db) =>
  (await db.query("select * from widget_uploads order by slug")).rows;

it("guards the published bytes and adds one marked phone block per file", () => {
  expect(manifest).toHaveLength(3);
  for (const row of manifest) {
    const html = file(row.slug);
    expect(hash("md5", atPhoneFit(html))).toBe(row.beforeMd5);
    expect(hash("md5", html)).toBe(row.afterMd5);
    expect(sql).toContain(
      `'${row.slug}', '${row.beforeMd5}', '${row.afterMd5}'`
    );
    expect(html.match(/Open Brain book \(OPENBRAIN-71\)/g)).toHaveLength(1);
    // Phones only: the figure pane is this narrow on a 1024px laptop too,
    // and must keep the layout it has.
    const block = html.slice(html.indexOf("(OPENBRAIN-71)"));
    expect(block.match(/@media[^{]+/g)).toEqual([
      "@media (max-width: 470px) and (max-device-width: 767px) ",
    ]);
  }
});
it("keeps the Retina fixture's upload entries on the committed files", () => {
  for (const { slug } of manifest) {
    const entry = fixture.uploads.find((upload) => upload.slug === slug);
    expect(entry.bytes).toBe(Buffer.byteLength(file(slug)));
    expect(entry.sha256).toBe(hash("sha256", file(slug)));
  }
});
describe.skipIf(!harness || !existsSync(harness))(
  "Retina phone widgets SQL",
  () => {
    it("writes exactly the committed files and keeps metadata and publication, twice", async () => {
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
    it("refuses an intervening author edit and changes nothing", async () => {
      const db = await fresh();
      try {
        await db.query(
          "update widget_uploads set html=html || '<!-- author edit -->' where slug=$1",
          [manifest.at(-1).slug]
        );
        const before = await rows(db);
        await expect(db.exec(sql)).rejects.toThrow(
          /changed since it was published/
        );
        expect(await rows(db)).toEqual(before);
      } finally {
        await db.close();
      }
    }, 30000);
  }
);
